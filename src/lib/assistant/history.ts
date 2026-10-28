import { MAX_HISTORY, type ChatMessage } from "./protocol";

/** Recorta el historial empezando en un mensaje del usuario, para no cortar una ronda de herramientas. */
export function trimHistory(messages: ChatMessage[], max = MAX_HISTORY): ChatMessage[] {
  if (messages.length <= max) return messages;
  let start = messages.length - max;
  while (start < messages.length && messages[start].role !== "user") start++;
  return messages.slice(start);
}
