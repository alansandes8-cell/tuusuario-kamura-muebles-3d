"use client";
/**
 * Conversación con el asistente. Se mantiene en memoria durante la sesión
 * (no se guarda en el navegador) para no conservar datos que el cliente escriba.
 */
import { create } from "zustand";
import type { ChatMessage } from "./protocol";

export type DisplayItem =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "applied"; text: string; ok: boolean };

interface AssistantState {
  display: DisplayItem[];
  history: ChatMessage[];
  mode: "unknown" | "ai" | "basic";
  busy: boolean;
  push: (...items: DisplayItem[]) => void;
  pushHistory: (...msgs: ChatMessage[]) => void;
  set: (patch: Partial<Pick<AssistantState, "mode" | "busy">>) => void;
}

export const useAssistant = create<AssistantState>()((set) => ({
  display: [],
  history: [],
  mode: "unknown",
  busy: false,
  push: (...items) => set((s) => ({ display: [...s.display, ...items] })),
  pushHistory: (...msgs) => set((s) => ({ history: [...s.history, ...msgs] })),
  set: (patch) => set(patch),
}));
