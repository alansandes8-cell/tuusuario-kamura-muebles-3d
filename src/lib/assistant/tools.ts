/**
 * Herramientas que el asistente puede usar. Son el único camino para que la IA
 * modifique el configurador: cada llamada se traduce a una acción validada.
 */
import { CATEGORY_IDS } from "@/lib/catalog";
import type { DesignAction } from "@/lib/design/actions";
import { WOODS } from "@/lib/woods";

export const STEP_TARGETS = ["estilo", "medidas", "madera", "diseno", "detalles", "revision", "cotizacion"] as const;
export type StepTarget = (typeof STEP_TARGETS)[number];

export const TOOL_DEFINITIONS = [
  {
    type: "function",
    function: {
      name: "cambiar_mueble",
      description: "Cambia el tipo de mueble que se está diseñando. Si el cliente ya tenía un borrador de ese mueble, se retoma.",
      parameters: {
        type: "object",
        properties: {
          categoria: { type: "string", enum: [...CATEGORY_IDS], description: "Id de la categoría." },
          estilo: { type: "string", description: "Id de la plantilla de partida (opcional)." },
        },
        required: ["categoria"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "aplicar_estilo",
      description: "Carga una plantilla (estilo de partida) de la categoría actual. Reemplaza medidas y opciones por las de la plantilla; mantiene la madera.",
      parameters: {
        type: "object",
        properties: { estilo: { type: "string", description: "Id de la plantilla." } },
        required: ["estilo"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cambiar_medida",
      description: "Cambia una medida del mueble actual, en centímetros.",
      parameters: {
        type: "object",
        properties: {
          medida: { type: "string", description: "Clave de la medida (por ejemplo 'largo')." },
          valor_cm: { type: "number", description: "Nuevo valor en centímetros." },
        },
        required: ["medida", "valor_cm"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "restaurar_medidas",
      description: "Vuelve a las medidas sugeridas del estilo actual.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "cambiar_madera",
      description: "Cambia la especie de madera de todo el mueble.",
      parameters: {
        type: "object",
        properties: { madera: { type: "string", enum: WOODS.map((w) => w.id) } },
        required: ["madera"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cambiar_opcion",
      description:
        "Cambia una opción de diseño del mueble actual. Para opciones de elección usar el valor indicado; para cantidades, el número como texto; para sí/no, 'si' o 'no'.",
      parameters: {
        type: "object",
        properties: {
          opcion: { type: "string", description: "Clave de la opción (por ejemplo 'estantes')." },
          valor: { type: "string", description: "Nuevo valor." },
        },
        required: ["opcion", "valor"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "deshacer",
      description: "Deshace el último cambio y vuelve al diseño anterior.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "ir_a_paso",
      description: "Abre un paso del configurador, la revisión del diseño o el formulario de cotización.",
      parameters: {
        type: "object",
        properties: { paso: { type: "string", enum: [...STEP_TARGETS] } },
        required: ["paso"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "agregar_observacion",
      description: "Agrega un texto a las observaciones para el carpintero (por ejemplo, un requisito que contó el cliente).",
      parameters: {
        type: "object",
        properties: { texto: { type: "string" } },
        required: ["texto"],
      },
    },
  },
] as const;

export type ToolName = (typeof TOOL_DEFINITIONS)[number]["function"]["name"];

export type ToolIntent =
  | { kind: "action"; action: DesignAction }
  | { kind: "undo" }
  | { kind: "step"; target: StepTarget }
  | { kind: "note"; text: string }
  | { kind: "error"; error: string };

/** Traduce una llamada de herramienta a una intención. No modifica nada. */
export function parseToolCall(name: string, rawArgs: string): ToolIntent {
  let args: Record<string, unknown>;
  try {
    args = rawArgs ? JSON.parse(rawArgs) : {};
    if (typeof args !== "object" || args === null) throw new Error();
  } catch {
    return { kind: "error", error: "Los parámetros del cambio no son válidos." };
  }
  const str = (k: string) => (typeof args[k] === "string" ? (args[k] as string) : args[k] === undefined ? "" : String(args[k]));
  switch (name) {
    case "cambiar_mueble":
      return { kind: "action", action: { type: "setCategory", category: str("categoria"), templateId: str("estilo") || undefined } };
    case "aplicar_estilo":
      return { kind: "action", action: { type: "applyTemplate", templateId: str("estilo") } };
    case "cambiar_medida": {
      const value = Number(args.valor_cm);
      if (!Number.isFinite(value)) return { kind: "error", error: "La medida tiene que ser un número." };
      return { kind: "action", action: { type: "setDimension", key: str("medida"), value } };
    }
    case "restaurar_medidas":
      return { kind: "action", action: { type: "resetDimensions" } };
    case "cambiar_madera":
      return { kind: "action", action: { type: "setWood", wood: str("madera") } };
    case "cambiar_opcion":
      return { kind: "action", action: { type: "setOption", key: str("opcion"), value: str("valor") } };
    case "deshacer":
      return { kind: "undo" };
    case "ir_a_paso": {
      const target = str("paso") as StepTarget;
      if (!STEP_TARGETS.includes(target)) return { kind: "error", error: "Ese paso no existe." };
      return { kind: "step", target };
    }
    case "agregar_observacion": {
      const text = str("texto").trim();
      if (!text) return { kind: "error", error: "La observación está vacía." };
      return { kind: "note", text: text.slice(0, 400) };
    }
    default:
      return { kind: "error", error: `La acción «${name}» no está disponible.` };
  }
}
