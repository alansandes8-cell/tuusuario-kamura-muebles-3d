import { MEDIDAS } from "@/config/medidas";
import { dim } from "../dim";
import { BOARD, box, boxFrom, leg, opt } from "../parts";
import type { CategoryDefinition, Issue, Part } from "../types";

const M = MEDIDAS.cama;
const FRAME = 3; // margen del marco alrededor del colchón
const MATTRESS = 24; // espesor del colchón de referencia

export const cama: CategoryDefinition = {
  id: "cama",
  slug: "bases-de-cama",
  name: "Bases de cama",
  singular: "base de cama",
  article: "la",
  tagline: "Descanso a la medida de tu colchón.",
  description:
    "Diseñá una base de cama en madera para tu colchón: medida, altura, respaldo, cajones y especie de madera.",
  dimensions: [
    dim("colchonAncho", "Ancho del colchón", M.colchonAncho, {
      help: "La base se arma alrededor del colchón. Elegí un tamaño estándar o cargá la medida exacta.",
      presets: [
        { label: "1 plaza", value: 80 },
        { label: "1½ plaza", value: 100 },
        { label: "2 plazas", value: 140 },
        { label: "Queen", value: 160 },
        { label: "King", value: 180 },
      ],
    }),
    dim("colchonLargo", "Largo del colchón", M.colchonLargo, {
      presets: [
        { label: "190 cm", value: 190 },
        { label: "200 cm", value: 200 },
      ],
    }),
    dim("altoBase", "Altura de la base", M.altoBase, { help: "Desde el piso hasta donde apoya el colchón." }),
    dim("altoRespaldo", "Altura del respaldo", M.altoRespaldo, {
      help: "Desde el piso hasta el borde superior del respaldo.",
      visibleWhen: (d) => d.options.respaldo !== "sin",
    }),
  ],
  options: [
    {
      key: "respaldo",
      label: "Respaldo",
      group: "Respaldo",
      type: "choice",
      default: "liso",
      choices: [
        { value: "sin", label: "Sin respaldo" },
        { value: "liso", label: "Liso", description: "Un panel continuo de madera." },
        { value: "listones", label: "Listones", description: "Listones horizontales entre dos parantes." },
      ],
    },
    {
      key: "base",
      label: "Tipo de base",
      group: "Base",
      type: "choice",
      default: "patas",
      choices: [
        { value: "patas", label: "Sobre patas", description: "Liviana a la vista, se ve el piso por debajo." },
        { value: "cajon", label: "Cajón cerrado", description: "Cerrada hasta el piso. Permite sumar cajones." },
      ],
    },
    {
      key: "cajones",
      label: "Cajones laterales",
      group: "Base",
      type: "choice",
      default: "sin",
      choices: [
        { value: "sin", label: "Sin cajones" },
        { value: "2", label: "2 cajones", description: "Uno de cada lado." },
        { value: "4", label: "4 cajones", description: "Dos de cada lado." },
      ],
      visibleWhen: (d) => d.options.base === "cajon",
    },
    {
      key: "mostrarColchon",
      label: "Mostrar colchón de referencia",
      help: "Solo para visualizar. El colchón no está incluido en el diseño.",
      group: "Vista",
      type: "toggle",
      default: true,
    },
  ],
  templates: [
    {
      id: "respaldo-liso",
      name: "Respaldo liso",
      description: "Base sobre patas con respaldo de un solo panel.",
      options: { respaldo: "liso", base: "patas", cajones: "sin" },
    },
    {
      id: "listones",
      name: "Respaldo de listones",
      description: "Respaldo con listones horizontales y base sobre patas.",
      dimensions: { altoRespaldo: 105 },
      options: { respaldo: "listones", base: "patas", cajones: "sin" },
    },
    {
      id: "plataforma",
      name: "Cajón con guardado",
      description: "Base cerrada con cajones a los costados.",
      dimensions: { altoBase: 40, altoRespaldo: 95 },
      options: { respaldo: "liso", base: "cajon", cajones: "2" },
    },
  ],
  defaultTemplateId: "respaldo-liso",
  build: (d) => {
    const mw = d.dimensions.colchonAncho;
    const ml = d.dimensions.colchonLargo;
    const hb = d.dimensions.altoBase;
    const W = mw + 2 * FRAME;
    const L = ml + 2 * FRAME;
    const base = opt(d.options, "base", "patas");
    const respaldo = opt(d.options, "respaldo", "liso");
    const parts: Part[] = [];

    if (base === "patas") {
      const railH = Math.min(18, hb - 6);
      const y0 = hb - railH;
      parts.push(boxFrom("larguero-izq", [-W / 2, y0, -L / 2], [FRAME, railH, L], "z"));
      parts.push(boxFrom("larguero-der", [W / 2 - FRAME, y0, -L / 2], [FRAME, railH, L], "z"));
      parts.push(boxFrom("travesano-pie", [-W / 2 + FRAME, y0, L / 2 - FRAME], [W - 2 * FRAME, railH, FRAME], "x"));
      parts.push(boxFrom("travesano-cabecera", [-W / 2 + FRAME, y0, -L / 2], [W - 2 * FRAME, railH, FRAME], "x"));
      parts.push(boxFrom("plataforma", [-W / 2 + FRAME, hb - BOARD, -L / 2 + FRAME], [W - 2 * FRAME, BOARD, L - 2 * FRAME], "z"));
      const legH = y0;
      const s = 7;
      for (const [i, [x, z]] of [
        [-W / 2 + s / 2, -L / 2 + s / 2],
        [W / 2 - s / 2, -L / 2 + s / 2],
        [-W / 2 + s / 2, L / 2 - s / 2],
        [W / 2 - s / 2, L / 2 - s / 2],
      ].entries()) {
        parts.push(leg(`pata-${i}`, "rectas", x, z, legH, s));
      }
      if (mw >= 140) {
        parts.push(boxFrom("larguero-central", [-3, y0, -L / 2 + FRAME], [6, railH, L - 2 * FRAME], "z"));
        parts.push(leg("pata-central-0", "rectas", 0, -L / 4, legH, 6));
        parts.push(leg("pata-central-1", "rectas", 0, L / 4, legH, 6));
      }
    } else {
      const plinth = 6;
      const bodyH = hb - plinth;
      parts.push(boxFrom("zocalo", [-W / 2 + 5, 0, -L / 2 + 5], [W - 10, plinth, L - 10], "x"));
      parts.push(boxFrom("lateral-izq", [-W / 2, plinth, -L / 2], [FRAME, bodyH, L], "z"));
      parts.push(boxFrom("lateral-der", [W / 2 - FRAME, plinth, -L / 2], [FRAME, bodyH, L], "z"));
      parts.push(boxFrom("frente-pie", [-W / 2 + FRAME, plinth, L / 2 - FRAME], [W - 2 * FRAME, bodyH, FRAME], "x"));
      parts.push(boxFrom("frente-cabecera", [-W / 2 + FRAME, plinth, -L / 2], [W - 2 * FRAME, bodyH, FRAME], "x"));
      parts.push(boxFrom("plataforma", [-W / 2 + FRAME, hb - BOARD, -L / 2 + FRAME], [W - 2 * FRAME, BOARD, L - 2 * FRAME], "z"));
      const cajones = opt(d.options, "cajones", "sin");
      if (cajones !== "sin") {
        const perSide = cajones === "4" ? 2 : 1;
        const zone = L * 0.7;
        const dl = (zone - (perSide - 1) * 2) / perSide;
        const dh = bodyH - 6;
        for (const side of [-1, 1]) {
          for (let i = 0; i < perSide; i++) {
            const z = -zone / 2 + 10 + dl / 2 + i * (dl + 2);
            const x = side * (W / 2 + 0.9);
            const id = `cajon-${side < 0 ? "izq" : "der"}-${i}`;
            parts.push(box(id, [x, plinth + bodyH / 2, z], [BOARD, dh, dl], "z"));
            parts.push(box(`${id}-unero`, [x + side * 0.92, plinth + bodyH - 4.5, z], [0.05, 1.6, Math.min(dl * 0.5, 30)], "z", "shadow"));
          }
        }
      }
    }

    if (respaldo !== "sin") {
      const hr = d.dimensions.altoRespaldo;
      const zr = -L / 2 - 2.5;
      if (respaldo === "liso") {
        parts.push(box("respaldo", [0, hr / 2, zr], [W + 4, hr, 4], "x"));
      } else {
        const post = 6;
        const xp = (W + 4) / 2 - post / 2;
        parts.push(box("respaldo-parante-izq", [-xp, hr / 2, zr], [post, hr, post], "y"));
        parts.push(box("respaldo-parante-der", [xp, hr / 2, zr], [post, hr, post], "y"));
        const top = hr - 1;
        const bottom = hb + 4;
        const slat = 8;
        const gap = 4;
        const n = Math.max(1, Math.floor((top - bottom + gap) / (slat + gap)));
        const used = n * slat + (n - 1) * gap;
        const start = top - used;
        for (let i = 0; i < n; i++) {
          const y = start + i * (slat + gap) + slat / 2;
          parts.push(box(`respaldo-liston-${i}`, [0, y, zr], [W + 4 - 2 * post, slat, 2.5], "x"));
        }
      }
    }

    if (opt(d.options, "mostrarColchon", true)) {
      parts.push(box("colchon", [0, hb + MATTRESS / 2, 0], [mw, MATTRESS, ml], "x", "reference", { cornerRadius: 4 }));
    }
    return parts;
  },
  incompatibilities: (d) => {
    const issues: Issue[] = [];
    if (d.options.base === "cajon" && d.options.cajones !== "sin" && d.dimensions.altoBase < 30) {
      issues.push({ field: "altoBase", message: "Para sumar cajones, la base necesita al menos 30 cm de altura." });
    }
    return issues;
  },
  reviewRules: (d) => {
    const issues: Issue[] = [];
    if (d.options.respaldo !== "sin" && d.dimensions.altoRespaldo < d.dimensions.altoBase + MATTRESS + 15) {
      issues.push({ field: "altoRespaldo", message: "Con esta altura, el respaldo apenas sobresale del colchón." });
    }
    return issues;
  },
};
