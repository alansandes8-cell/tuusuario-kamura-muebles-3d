/**
 * Conexión con el proveedor de IA (API compatible con OpenAI).
 *
 * Por defecto usa Google Gemini, que tiene un nivel gratuito. También funciona
 * con Groq u otros proveedores compatibles cambiando AI_BASE_URL y AI_MODEL.
 * La clave nunca llega al navegador.
 */
import type { ChatMessage, ToolCall } from "@/lib/assistant/protocol";
import { TOOL_DEFINITIONS } from "@/lib/assistant/tools";

export const DEFAULT_AI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai";
export const DEFAULT_AI_MODEL = "gemini-2.5-flash";

export function aiConfigured(): boolean {
  return Boolean(process.env.AI_API_KEY);
}

export class AiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

export interface AiReply {
  content: string;
  toolCalls: ToolCall[];
}

interface ProviderMessage {
  role: string;
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
  name?: string;
}

function toProvider(m: ChatMessage): ProviderMessage {
  if (m.role === "assistant" && m.tool_calls?.length) {
    return {
      role: "assistant",
      content: m.content || null,
      tool_calls: m.tool_calls.map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.arguments } })),
    };
  }
  if (m.role === "tool") return { role: "tool", content: m.content, tool_call_id: m.tool_call_id, name: m.name };
  return { role: m.role, content: m.content };
}

export async function chatCompletion(
  system: string,
  messages: ChatMessage[],
  opts: { allowTools: boolean; fetchImpl?: typeof fetch } = { allowTools: true },
): Promise<AiReply> {
  const base = (process.env.AI_BASE_URL || DEFAULT_AI_BASE_URL).replace(/\/$/, "");
  const model = process.env.AI_MODEL || DEFAULT_AI_MODEL;
  const doFetch = opts.fetchImpl ?? fetch;
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: "system", content: system }, ...messages.map(toProvider)],
    temperature: 0.4,
    max_tokens: Number(process.env.AI_MAX_TOKENS ?? 600),
  };
  if (opts.allowTools) {
    body.tools = TOOL_DEFINITIONS;
    body.tool_choice = "auto";
  }
  let res: Response;
  try {
    res = await doFetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.AI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(Number(process.env.AI_TIMEOUT_MS ?? 20000)),
    });
  } catch (e) {
    throw new AiError(e instanceof Error ? e.message : "Sin conexión con el proveedor");
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new AiError(`Proveedor respondió ${res.status}: ${text.slice(0, 200)}`, res.status);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string | null; tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }[] } }[];
  };
  const msg = data.choices?.[0]?.message;
  if (!msg) throw new AiError("Respuesta vacía del proveedor");
  const toolCalls: ToolCall[] = (msg.tool_calls ?? [])
    .filter((c) => c.function?.name)
    .slice(0, 6)
    .map((c, i) => ({
      id: c.id || `call_${Date.now()}_${i}`,
      name: c.function!.name!,
      arguments: c.function!.arguments ?? "{}",
    }));
  return { content: (msg.content ?? "").trim(), toolCalls };
}
