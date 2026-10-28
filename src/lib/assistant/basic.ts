/**
 * Modo básico del asistente: interpreta pedidos simples sin un modelo de
 * lenguaje. Se usa cuando el servicio de IA no está configurado o no responde.
 * Devuelve llamadas a las mismas herramientas que usa la IA, así que los
 * cambios pasan por la misma validación.
 */
import { CATEGORIES, getCategory } from "@/lib/catalog";
import type { Design } from "@/lib/design/design";
import { visibleDimensions, visibleOptions } from "@/lib/design/visibility";
import { normalizeText, WOODS } from "@/lib/woods";
import type { ToolCall } from "./protocol";

export interface BasicResult {
  calls: ToolCall[];
  /** Respuesta cuando no se reconoce ningún cambio. */
  reply?: string;
}

const NUMBERS: Record<string, number> = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8 };

let seq = 0;
const call = (name: string, args: Record<string, unknown>): ToolCall => ({ id: `basic-${++seq}`, name, arguments: JSON.stringify(args) });

function parseNumber(s: string): number | undefined {
  const m = /(\d+(?:[.,]\d+)?)/.exec(s);
  if (m) return Number(m[1].replace(",", "."));
  for (const [w, n] of Object.entries(NUMBERS)) if (new RegExp(`\\b${w}\\b`).test(s)) return n;
  return undefined;
}

const DIM_WORDS: [RegExp, string[]][] = [
  [/\b(larg[oa]|largo)\b/, ["largo", "colchonLargo"]],
  [/\b(ancho|ancha|anch)\b/, ["ancho", "colchonAncho"]],
  [/\b(alto|alta|altura)\b/, ["alto", "altoBase"]],
  [/\b(profund[oa]|profundidad|fondo)\b/, ["profundidad"]],
  [/\bdiametro\b/, ["diametro"]],
  [/\brespaldo\b/, ["altoRespaldo"]],
];

export function interpretBasic(text: string, design: Design): BasicResult {
  const t = normalizeText(text);
  const calls: ToolCall[] = [];
  const cat = getCategory(design.category)!;

  if (/\b(deshac|volv(e|amos)|anterior|atras)\b/.test(t) && /\b(diseno|cambio|anterior|atras|deshac)/.test(t)) {
    return { calls: [call("deshacer", {})] };
  }

  for (const w of WOODS) {
    if (t.includes(normalizeText(w.name))) {
      calls.push(call("cambiar_madera", { madera: w.id }));
      break;
    }
  }

  for (const c of CATEGORIES) {
    const names = [c.singular, c.name, c.id].map(normalizeText);
    if (c.id !== design.category && names.some((n) => new RegExp(`\\b${n}\\b`).test(t)) && /\b(quiero|prefiero|cambi|disen|mejor|hacer)/.test(t)) {
      calls.push(call("cambiar_mueble", { categoria: c.id }));
      return { calls };
    }
  }

  // Cantidades: "tres cajones", "5 estantes", "más estantes".
  for (const spec of visibleOptions(design)) {
    if (spec.type !== "count") continue;
    const unitWords = spec.unit.map(normalizeText);
    const re = new RegExp(`(\\d+|${Object.keys(NUMBERS).join("|")})\\s+(${unitWords.join("|")})`);
    const m = re.exec(t);
    if (m) {
      const n = parseNumber(m[1]);
      if (n !== undefined) calls.push(call("cambiar_opcion", { opcion: spec.key, valor: String(n) }));
      continue;
    }
    if (unitWords.some((u) => t.includes(u))) {
      const current = Number(design.options[spec.key]);
      if (/\bmas\b/.test(t)) calls.push(call("cambiar_opcion", { opcion: spec.key, valor: String(current + 1) }));
      else if (/\bmenos\b/.test(t)) calls.push(call("cambiar_opcion", { opcion: spec.key, valor: String(current - 1) }));
    }
  }

  // Elecciones por nombre de opción ("patas cónicas", "con puertas").
  for (const spec of visibleOptions(design)) {
    if (spec.type !== "choice") continue;
    for (const choice of spec.choices) {
      const label = normalizeText(choice.label);
      if (label.length > 3 && t.includes(label) && design.options[spec.key] !== choice.value) {
        calls.push(call("cambiar_opcion", { opcion: spec.key, valor: choice.value }));
        break;
      }
    }
  }

  // Medidas: "que mida 200 de largo", "más larga", "un poco más alta".
  const dims = visibleDimensions(design);
  for (const [re, keys] of DIM_WORDS) {
    if (!re.test(t)) continue;
    const spec = dims.find((d) => keys.includes(d.key));
    if (!spec) continue;
    const current = design.dimensions[spec.key];
    const explicit = /(\d+(?:[.,]\d+)?)\s*(cm|centimetros|m|metros)?/.exec(t);
    if (explicit && !/\b(cajon|estante|modulo|columna)/.test(t)) {
      let v = Number(explicit[1].replace(",", "."));
      if (explicit[2] === "m" || explicit[2] === "metros" || v < 4) v *= 100;
      calls.push(call("cambiar_medida", { medida: spec.key, valor_cm: v }));
    } else if (/\bmas\b/.test(t) || /\b(agrand|alarg)/.test(t)) {
      const step = /\bpoco\b/.test(t) ? 0.06 : 0.12;
      calls.push(call("cambiar_medida", { medida: spec.key, valor_cm: Math.round(current * (1 + step)) }));
    } else if (/\bmenos\b/.test(t) || /\b(achic|acort)/.test(t)) {
      const step = /\bpoco\b/.test(t) ? 0.06 : 0.12;
      calls.push(call("cambiar_medida", { medida: spec.key, valor_cm: Math.round(current * (1 - step)) }));
    }
    break;
  }

  if (/\b(cotiz|presupuesto|precio|cuanto (sale|cuesta))/.test(t) && calls.length === 0) {
    return {
      calls: [],
      reply:
        "No mostramos precios en el configurador: el equipo de Kamura revisa tu diseño y te prepara una cotización personalizada. Cuando quieras, tocá «Solicitar cotización».",
    };
  }

  if (calls.length === 0) {
    const examples = [
      `«quiero verlo en ${WOODS[5].name.toLowerCase()}»`,
      cat.dimensions[0] ? `«que mida ${cat.dimensions[0].default + 20} de ${cat.dimensions[0].label.toLowerCase()}»` : "",
      "«volvamos al diseño anterior»",
    ].filter(Boolean);
    return {
      calls,
      reply: `En este momento solo puedo aplicar pedidos simples, por ejemplo: ${examples.join(", ")}. También podés usar los controles del panel.`,
    };
  }
  return { calls };
}
