/** Formato de mensajes entre el navegador y /api/assistant (compatible con la API de OpenAI). */
export interface ToolCall {
  id: string;
  name: string;
  /** Argumentos en JSON. */
  arguments: string;
}

export type ChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; name: string; content: string };

export interface AssistantRequest {
  messages: ChatMessage[];
  design: unknown;
  /** Cuántas rondas de herramientas lleva esta respuesta (límite de seguridad). */
  toolRound: number;
}

export type AssistantResponse =
  | { type: "tool_calls"; message: { role: "assistant"; content: string; tool_calls: ToolCall[] } }
  | { type: "message"; content: string }
  | { type: "error"; error: string; code: "unavailable" | "rate_limited" | "invalid" | "upstream" };

export const MAX_TOOL_ROUNDS = 3;
export const MAX_MESSAGE_CHARS = 1200;
export const MAX_HISTORY = 24;
