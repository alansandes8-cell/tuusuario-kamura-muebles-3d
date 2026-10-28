import { MEDIDAS } from "@/config/medidas";
import { dim } from "../dim";
import { BOARD, box, boxFrom, cornerLegs, cylinder, leg, opt, type LegStyle } from "../parts";
import type { CategoryDefinition, Part } from "../types";

const M = MEDIDAS.ratona;
const TOP = 3;
const isRound = (o: Record<string, unknown>) => o.forma === "redonda";

export const ratona: CategoryDefinition = {
  id: "ratona",
  slug: "mesas-ratonas",
  name: "Mesas ratonas",
  singular: "mesa ratona",
  article: "la",
  tagline: "Un apoyo cálido en el living.",
  description:
    "Diseñá una mesa ratona de madera: rectangular o redonda, con patas o en bloque, con o sin estante inferior.",
  dimensions: [
    dim("largo", "Largo", M.largo, { visibleWhen: (d) => !isRound(d.options) }),
    dim("ancho", "Ancho", M.ancho, { visibleWhen: (d) => !isRound(d.options) }),
    dim("diametro", "Diámetro", M.diametro, { visibleWhen: (d) => isRound(d.options) }),
    dim("alto", "Altura", M.alto, { help: "Suele acompañar la altura del asiento del sillón o quedar un poco más baja." }),
  ],
  options: [
    {
      key: "forma",
      label: "Forma de la tapa",
      group: "Tapa",
      type: "choice",
      default: "rectangular",
      choices: [
        { value: "rectangular", label: "Rectangular" },
        { value: "redonda", label: "Redonda" },
      ],
    },
    {
      key: "esquinas",
      label: "Esquinas",
      group: "Tapa",
      type: "choice",
      default: "redondeadas",
      choices: [
        { value: "rectas", label: "Rectas" },
        { value: "redondeadas", label: "Redondeadas" },
      ],
      visibleWhen: (d) => !isRound(d.options),
    },
    {
      key: "base",
      label: "Base",
      group: "Base",
      type: "choice",
      default: "conicas",
      choices: [
        { value: "conicas", label: "Patas cónicas" },
        { value: "rectas", label: "Patas rectas" },
        { value: "bloque", label: "Bloque", description: "Base maciza con un hueco pasante." },
      ],
    },
    {
      key: "estanteInferior",
      label: "Estante inferior",
      help: "Para revistas, canastos o mantas.",
      group: "Base",
      type: "toggle",
      default: false,
      visibleWhen: (d) => d.options.base !== "bloque",
    },
  ],
  templates: [
    { id: "redonda", name: "Redonda nórdica", description: "Tapa circular sobre patas cónicas.", options: { forma: "redonda", base: "conicas", estanteInferior: false } },
    { id: "con-estante", name: "Con estante", description: "Rectangular con estante inferior.", options: { forma: "rectangular", esquinas: "rectas", base: "rectas", estanteInferior: true } },
    { id: "bloque", name: "Bloque", description: "Volumen macizo con hueco pasante.", dimensions: { alto: 35 }, options: { forma: "rectangular", esquinas: "rectas", base: "bloque" } },
  ],
  defaultTemplateId: "redonda",
  build: (d) => {
    const H = d.dimensions.alto;
    const round = isRound(d.options);
    const L = round ? d.dimensions.diametro : d.dimensions.largo;
    const A = round ? d.dimensions.diametro : d.dimensions.ancho;
    const base = opt(d.options, "base", "conicas");
    const radius = round ? L / 2 : opt(d.options, "esquinas", "redondeadas") === "redondeadas" ? Math.min(6, A / 6) : 0;
    const parts: Part[] = [box("tapa", [0, H - TOP / 2, 0], [L, TOP, A], "x", "wood", { cornerRadius: radius })];
    const legH = H - TOP;

    if (base === "bloque") {
      if (round) {
        parts.push(cylinder("bloque", [0, legH / 2, 0], L * 0.32, L * 0.32, legH, 48));
      } else {
        const bw = L - 16;
        const bd = A - 12;
        parts.push(boxFrom("bloque-lateral-izq", [-bw / 2, 0, -bd / 2], [3, legH, bd], "y"));
        parts.push(boxFrom("bloque-lateral-der", [bw / 2 - 3, 0, -bd / 2], [3, legH, bd], "y"));
        parts.push(boxFrom("bloque-piso", [-bw / 2 + 3, 0, -bd / 2], [bw - 6, 3, bd], "x"));
      }
      return parts;
    }

    const style = base as LegStyle;
    if (round) {
      const r = (L / 2) * 0.62;
      [45, 135, 225, 315].forEach((deg, i) => {
        const a = (deg * Math.PI) / 180;
        parts.push(leg(`pata-${i}`, style, Math.cos(a) * r, Math.sin(a) * r, legH, 5));
      });
    } else {
      parts.push(...cornerLegs("pata", style, L, A, legH, 5, 5));
    }
    if (opt(d.options, "estanteInferior", false)) {
      const y = Math.min(14, legH * 0.35);
      if (round) {
        const sd = L * 0.62 * Math.SQRT2;
        parts.push(box("estante", [0, y, 0], [sd, BOARD, sd], "x", "wood", { cornerRadius: sd / 2 }));
      } else {
        parts.push(box("estante", [0, y, 0], [L - 10, BOARD, A - 10], "x"));
      }
    }
    return parts;
  },
};
