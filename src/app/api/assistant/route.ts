import { NextResponse } from "next/server";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/assistant/context";
import { trimHistory } from "@/lib/assistant/history";
import { MAX_MESSAGE_CHARS, MAX_TOOL_ROUNDS, type AssistantResponse, type ChatMessage } from "@/lib/assistant/protocol";
import { parseDesign } from "@/lib/design/design";
import { aiConfigured, AiError, chatCompletion } from "@/lib/server/ai";
import { rateLimit } from "@/lib/server/rateLimit";
import { clientIp, hashIp, isSameOrigin } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const toolCallSchema = z.object({ id: z.string().max(100), name: z.string().max(60), arguments: z.string().max(2000) });
const messageSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), content: z.string().max(MAX_MESSAGE_CHARS) }),
  z.object({ role: z.literal("assistant"), content: z.string().max(4000), tool_calls: z.array(toolCallSchema).max(6).optional() }),
  z.object({ role: z.literal("tool"), tool_call_id: z.string().max(100), name: z.string().max(60), content: z.string().max(2000) }),
]);
const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(200),
  design: z.unknown(),
  toolRound: z.number().int().min(0).max(10),
});

const reply = (r: AssistantResponse, status = 200) => NextResponse.json(r, { status });

export async function GET() {
  return NextResponse.json({ available: aiConfigured() });
}

export async function POST(req: Request) {
  if (!aiConfigured()) return reply({ type: "error", code: "unavailable", error: "El asistente con IA no está configurado." }, 503);
  if (!isSameOrigin(req)) return reply({ type: "error", code: "invalid", error: "Origen no permitido." }, 403);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return reply({ type: "error", code: "invalid", error: "No pude leer tu mensaje. Probá de nuevo." }, 400);
  const design = parseDesign(parsed.data.design);
  if (!design.ok) return reply({ type: "error", code: "invalid", error: "No pude leer el estado del diseño." }, 400);

  const ipHash = hashIp(clientIp(req.headers));
  const dailyLimit = Number(process.env.AI_DAILY_LIMIT ?? 800);
  const perIp = (await rateLimit(`ai:${ipHash}`, 40, 600)) && (await rateLimit(`ai:d:${ipHash}`, 200, 86400));
  if (!perIp) {
    return reply({ type: "error", code: "rate_limited", error: "Hiciste muchas consultas seguidas. Esperá unos minutos; mientras tanto podés seguir con los controles del panel." }, 429);
  }
  if (!(await rateLimit("ai:global", dailyLimit, 86400))) {
    return reply({ type: "error", code: "unavailable", error: "El asistente alcanzó su límite de uso diario." }, 503);
  }

  try {
    const result = await chatCompletion(buildSystemPrompt(design.design), trimHistory(parsed.data.messages as ChatMessage[]), {
      allowTools: parsed.data.toolRound < MAX_TOOL_ROUNDS,
    });
    if (result.toolCalls.length) {
      return reply({ type: "tool_calls", message: { role: "assistant", content: result.content, tool_calls: result.toolCalls } });
    }
    return reply({ type: "message", content: result.content || "¿Me contás un poco más qué te gustaría lograr?" });
  } catch (e) {
    console.error("[kamura] Error del asistente", e instanceof AiError ? `${e.status ?? ""} ${e.message}` : e);
    const limited = e instanceof AiError && e.status === 429;
    return reply(
      {
        type: "error",
        code: "upstream",
        error: limited ? "El asistente está muy solicitado en este momento." : "El asistente no respondió.",
      },
      502,
    );
  }
}
