"use client";
/**
 * Estado del configurador.
 *
 * - Guarda un borrador por categoría, así el cliente puede cambiar de mueble y
 *   volver sin perder lo que hizo.
 * - Toda modificación pasa por `applyAction` (validada).
 * - Se guarda automáticamente en el navegador SOLO la configuración del mueble:
 *   nunca datos personales ni archivos.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { CategoryId } from "@/lib/catalog";
import { applyAction, type ActionResult, type DesignAction } from "@/lib/design/actions";
import { createDesign, parseDesign, type Design } from "@/lib/design/design";

import type { StepId } from "./steps";

export { STEPS, type StepId } from "./steps";

export type ChangeSource = "usuario" | "asistente";

export interface ChangeEntry {
  at: string;
  source: ChangeSource;
  category: CategoryId;
  summary: string;
  /** Campo modificado, para agrupar cambios sucesivos del mismo control. */
  field?: string;
}

const HISTORY_LIMIT = 40;
const LOG_LIMIT = 60;
/** Cambios sucesivos del mismo control dentro de este lapso se deshacen juntos (ej. arrastrar un deslizador). */
const COALESCE_MS = 1200;
let lastHistory: { field?: string; at: number } = { at: 0 };

interface ConfiguratorState {
  drafts: Partial<Record<CategoryId, Design>>;
  active: CategoryId | null;
  step: StepId;
  past: Design[];
  future: Design[];
  changeLog: ChangeEntry[];
  /** Fotos del ambiente o referencias. Solo en memoria, no se guardan en el navegador. */
  attachments: File[];
  hydrated: boolean;

  start: (category: CategoryId, templateId?: string) => void;
  dispatch: (action: DesignAction, source?: ChangeSource) => ActionResult;
  undo: () => { ok: boolean; summary: string };
  redo: () => { ok: boolean; summary: string };
  setStep: (step: StepId) => void;
  loadDesign: (design: Design) => void;
  restart: () => void;
  setAttachments: (files: File[]) => void;
  clearAfterSubmit: () => void;
}

function fieldOf(action: DesignAction): string | undefined {
  if (action.type === "setDimension" || action.type === "setOption") return action.key;
  if (action.type === "setDetails") return `details:${Object.keys(action.patch).join(",")}`;
  return action.type;
}

export const useConfigurator = create<ConfiguratorState>()(
  persist(
    (set, get) => ({
      drafts: {},
      active: null,
      step: "estilo",
      past: [],
      future: [],
      changeLog: [],
      attachments: [],
      hydrated: false,

      start: (category, templateId) => {
        const { drafts, active } = get();
        const existing = drafts[category];
        if (existing && !templateId) {
          if (active !== category) set({ active: category });
          return;
        }
        if (existing && templateId === existing.templateId) {
          set({ active: category });
          return;
        }
        const wood = existing?.wood ?? (active ? drafts[active]?.wood : undefined);
        const design = createDesign(category, templateId, wood);
        set({
          active: category,
          drafts: { ...drafts, [category]: design },
          past: existing ? [...get().past, existing].slice(-HISTORY_LIMIT) : get().past,
          future: [],
          step: "estilo",
        });
      },

      dispatch: (action, source = "usuario") => {
        const { drafts, active } = get();
        const current = active ? drafts[active] : undefined;
        if (!current) return { ok: false, error: "Primero elegí un tipo de mueble." };
        const result = applyAction(current, action);
        if (!result.ok) return result;
        const next = result.design;
        const field = fieldOf(action);
        const log = [...get().changeLog];
        const last = log[log.length - 1];
        const entry: ChangeEntry = { at: new Date().toISOString(), source, category: next.category, summary: result.summary, field };
        if (last && last.field === field && last.source === source && last.category === next.category && field !== "setCategory") {
          log[log.length - 1] = entry;
        } else if (action.type !== "setDetails") {
          log.push(entry);
        }
        // Los textos de detalles no se agregan al historial de deshacer, y los
        // cambios continuos del mismo control se agrupan en un solo paso.
        const now = Date.now();
        const coalesce = field !== undefined && lastHistory.field === field && now - lastHistory.at < COALESCE_MS;
        const pushHistory = action.type !== "setDetails" && !coalesce;
        lastHistory = { field, at: now };
        set({
          active: next.category,
          drafts: { ...drafts, [next.category]: next },
          past: pushHistory ? [...get().past, current].slice(-HISTORY_LIMIT) : get().past,
          future: pushHistory ? [] : get().future,
          changeLog: log.slice(-LOG_LIMIT),
        });
        return result;
      },

      undo: () => {
        const { past, drafts, active } = get();
        const prev = past[past.length - 1];
        if (!prev || !active) return { ok: false, summary: "No hay cambios para deshacer." };
        const current = drafts[active]!;
        set({
          past: past.slice(0, -1),
          future: [current, ...get().future].slice(0, HISTORY_LIMIT),
          active: prev.category,
          drafts: { ...drafts, [prev.category]: { ...prev, details: drafts[prev.category]?.details ?? prev.details } },
          changeLog: [
            ...get().changeLog,
            { at: new Date().toISOString(), source: "usuario" as const, category: prev.category, summary: "Se deshizo el último cambio", field: "undo" },
          ].slice(-LOG_LIMIT),
        });
        return { ok: true, summary: "Volví al diseño anterior." };
      },

      redo: () => {
        const { future, drafts, active } = get();
        const next = future[0];
        if (!next || !active) return { ok: false, summary: "No hay cambios para rehacer." };
        set({
          future: future.slice(1),
          past: [...get().past, drafts[active]!].slice(-HISTORY_LIMIT),
          active: next.category,
          drafts: { ...drafts, [next.category]: next },
        });
        return { ok: true, summary: "Cambio rehecho." };
      },

      setStep: (step) => set({ step }),

      loadDesign: (design) => {
        const { drafts, active } = get();
        const current = active ? drafts[active] : undefined;
        set({
          active: design.category,
          drafts: { ...drafts, [design.category]: design },
          past: current ? [...get().past, current].slice(-HISTORY_LIMIT) : get().past,
          future: [],
          step: "estilo",
        });
      },

      restart: () => {
        const { active, drafts } = get();
        if (!active) return;
        const current = drafts[active]!;
        set({
          drafts: { ...drafts, [active]: createDesign(active) },
          past: [...get().past, current].slice(-HISTORY_LIMIT),
          future: [],
          step: "estilo",
        });
      },

      setAttachments: (files) => set({ attachments: files }),

      clearAfterSubmit: () => {
        const { active, drafts } = get();
        if (!active) return;
        const rest = { ...drafts };
        delete rest[active];
        set({ drafts: rest, active: null, past: [], future: [], changeLog: [], attachments: [], step: "estilo" });
      },
    }),
    {
      name: "kamura-configurador",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ drafts: s.drafts, active: s.active, step: s.step, changeLog: s.changeLog }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ConfiguratorState>;
        const drafts: Partial<Record<CategoryId, Design>> = {};
        for (const raw of Object.values(p.drafts ?? {})) {
          const r = parseDesign(raw);
          if (r.ok) drafts[r.design.category] = r.design;
        }
        const active = p.active && drafts[p.active] ? p.active : null;
        return {
          ...current,
          drafts,
          active,
          step: p.step ?? "estilo",
          changeLog: Array.isArray(p.changeLog) ? p.changeLog.slice(-LOG_LIMIT) : [],
        };
      },
      onRehydrateStorage: () => () => {
        useConfigurator.setState({ hydrated: true });
      },
    },
  ),
);

export function useActiveDesign(): Design | undefined {
  return useConfigurator((s) => (s.active ? s.drafts[s.active] : undefined));
}

/** Hidrata el estado guardado (una sola vez, en el cliente). */
export function hydrateConfigurator() {
  if (useConfigurator.getState().hydrated) return;
  try {
    void useConfigurator.persist.rehydrate();
  } catch {
    useConfigurator.setState({ hydrated: true });
  }
}
