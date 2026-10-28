import { MEDIDAS } from "@/config/medidas";
import { dim } from "../dim";
import {
  BOARD,
  box,
  boxFrom,
  cornerLegs,
  front,
  handleOption,
  legStyleOption,
  opt,
  splitRange,
  type HandleStyle,
  type LegStyle,
} from "../parts";
import type { CategoryDefinition, Issue, Part } from "../types";

const M = MEDIDAS.escritorio;
const TOP = 3;
const PEDESTAL_W = 40;

export const escritorio: CategoryDefinition = {
  id: "escritorio",
  slug: "escritorios",
  name: "Escritorios",
  singular: "escritorio",
  article: "el",
  tagline: "Un lugar propio para trabajar y estudiar.",
  description:
    "Diseñá un escritorio de madera a medida: tamaño de la tapa, altura, cajonera, repisa para monitor y tipo de estructura.",
  dimensions: [
    dim("ancho", "Ancho", M.ancho),
    dim("profundidad", "Profundidad", M.profundidad),
    dim("alto", "Altura total", M.alto, { help: "Para trabajar sentado suele rondar los 75 cm." }),
  ],
  options: [
    {
      key: "estructura",
      label: "Estructura",
      group: "Base",
      type: "choice",
      default: "patas",
      choices: [
        { value: "patas", label: "Patas", description: "Cuatro patas, liviano y despejado." },
        { value: "laterales", label: "Laterales macizos", description: "Dos paneles laterales y un frentín trasero." },
      ],
    },
    legStyleOption((d) => d.options.estructura === "patas"),
    {
      key: "cajonera",
      label: "Cajonera",
      group: "Guardado",
      type: "choice",
      default: "sin",
      choices: [
        { value: "sin", label: "Sin cajonera" },
        { value: "izquierda", label: "A la izquierda" },
        { value: "derecha", label: "A la derecha" },
      ],
    },
    {
      key: "cajones",
      label: "Cajones",
      group: "Guardado",
      type: "count",
      min: 1,
      max: 4,
      default: 3,
      unit: ["cajón", "cajones"],
      visibleWhen: (d) => d.options.cajonera !== "sin",
    },
    {
      key: "repisa",
      label: "Repisa elevada para monitor",
      group: "Guardado",
      type: "toggle",
      default: false,
    },
    { ...handleOption, visibleWhen: (d) => d.options.cajonera !== "sin" },
  ],
  templates: [
    {
      id: "simple",
      name: "Simple",
      description: "Tapa y cuatro patas cónicas. Nada más.",
      options: { estructura: "patas", estiloPatas: "conicas", cajonera: "sin", repisa: false },
    },
    {
      id: "con-cajonera",
      name: "Con cajonera",
      description: "Cajonera a la derecha hasta el piso.",
      dimensions: { ancho: 140 },
      options: { estructura: "patas", estiloPatas: "rectas", cajonera: "derecha", cajones: 3, tirador: "perilla", repisa: false },
    },
    {
      id: "laterales",
      name: "Laterales macizos",
      description: "Paneles laterales y repisa elevada.",
      options: { estructura: "laterales", cajonera: "sin", repisa: true },
    },
  ],
  defaultTemplateId: "simple",
  build: (d) => {
    const W = d.dimensions.ancho;
    const D = d.dimensions.profundidad;
    const H = d.dimensions.alto;
    const legH = H - TOP;
    const cajonera = opt(d.options, "cajonera", "sin");
    const parts: Part[] = [box("tapa", [0, H - TOP / 2, 0], [W, TOP, D], "x", "wood", { cornerRadius: 1 })];

    // Cajonera hasta el piso del lado elegido.
    let pedestalX: number | null = null;
    if (cajonera !== "sin") {
      const side = cajonera === "izquierda" ? -1 : 1;
      pedestalX = side * (W / 2 - 3 - PEDESTAL_W / 2);
      const pd = D - 6;
      const x0 = pedestalX - PEDESTAL_W / 2;
      const plinth = 6;
      const bodyH = legH - plinth;
      parts.push(boxFrom("cajonera-zocalo", [x0 + 2, 0, -pd / 2], [PEDESTAL_W - 4, plinth, pd - 2], "x"));
      parts.push(boxFrom("cajonera-lateral-izq", [x0, plinth, -pd / 2], [BOARD, bodyH, pd - BOARD], "y"));
      parts.push(boxFrom("cajonera-lateral-der", [x0 + PEDESTAL_W - BOARD, plinth, -pd / 2], [BOARD, bodyH, pd - BOARD], "y"));
      const n = opt(d.options, "cajones", 3) as number;
      splitRange(plinth, legH, n).forEach((r, i) => {
        parts.push(
          ...front(`cajon-${i}`, { x0, x1: x0 + PEDESTAL_W, y0: r.y0, y1: r.y1 }, pd / 2 - BOARD, opt(d.options, "tirador", "unero") as HandleStyle, "cajon"),
        );
      });
    }

    if (opt(d.options, "estructura", "patas") === "laterales") {
      const t = 3.5;
      for (const side of [-1, 1]) {
        const x = side * (W / 2 - 3 - t / 2);
        if (pedestalX !== null && Math.sign(pedestalX) === side) continue;
        parts.push(box(`lateral-${side < 0 ? "izq" : "der"}`, [x, legH / 2, 0], [t, legH, D - 6], "y"));
      }
      const xl = pedestalX !== null && pedestalX < 0 ? -W / 2 + 3 + PEDESTAL_W : -W / 2 + 3 + 3.5;
      const xr = pedestalX !== null && pedestalX > 0 ? W / 2 - 3 - PEDESTAL_W : W / 2 - 3 - 3.5;
      parts.push(boxFrom("frentin", [xl, legH - 30, -D / 2 + 4], [xr - xl, 30, BOARD], "x"));
    } else {
      const style = opt(d.options, "estiloPatas", "conicas") as LegStyle;
      const all = cornerLegs("pata", style, W, D, legH, 4, 5);
      // Las patas del lado de la cajonera se reemplazan por la cajonera.
      parts.push(...all.filter((p) => pedestalX === null || Math.sign(p.position[0]) !== Math.sign(pedestalX)));
      const zf = D / 2 - 4 - 1;
      const x0 = -W / 2 + 9;
      const x1 = pedestalX !== null && pedestalX > 0 ? W / 2 - 3 - PEDESTAL_W : W / 2 - 9;
      const xs = pedestalX !== null && pedestalX < 0 ? -W / 2 + 3 + PEDESTAL_W : x0;
      parts.push(boxFrom("faldon-atras", [xs, legH - 7, -zf - 1], [x1 - xs, 7, 2], "x"));
    }

    if (opt(d.options, "repisa", false)) {
      const rw = Math.min(W * 0.6, 100);
      const rh = 11;
      const rd = Math.min(24, D * 0.4);
      const z = -D / 2 + 3 + rd / 2;
      parts.push(box("repisa", [0, H + rh - BOARD / 2, z], [rw, BOARD, rd], "x"));
      parts.push(box("repisa-apoyo-izq", [-rw / 2 + 1.5, H + (rh - BOARD) / 2, z], [3, rh - BOARD, rd], "y"));
      parts.push(box("repisa-apoyo-der", [rw / 2 - 1.5, H + (rh - BOARD) / 2, z], [3, rh - BOARD, rd], "y"));
    }
    return parts;
  },
  incompatibilities: (d) => {
    const issues: Issue[] = [];
    if (d.options.cajonera !== "sin" && d.dimensions.ancho < 100) {
      issues.push({ field: "ancho", message: "Para sumar una cajonera, el escritorio necesita al menos 100 cm de ancho." });
    }
    const n = Number(d.options.cajones ?? 3);
    if (d.options.cajonera !== "sin" && (d.dimensions.alto - TOP - 6) / n < 12) {
      issues.push({ field: "cajones", message: "No entran tantos cajones en esa altura. Probá con menos cajones." });
    }
    return issues;
  },
};
