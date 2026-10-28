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
  type HandleStyle,
  type LegStyle,
} from "../parts";
import type { CategoryDefinition, Issue, Part } from "../types";

const M = MEDIDAS.recibidor;
const TOP = 3;
const DRAWER_H = 14;
const isBanco = (o: Record<string, unknown>) => o.tipo === "banco";

export const recibidor: CategoryDefinition = {
  id: "recibidor",
  slug: "recibidores",
  name: "Recibidores",
  singular: "recibidor",
  article: "el",
  tagline: "La bienvenida de tu casa.",
  description:
    "Diseñá un recibidor en madera: consola angosta con cajones o estante, o banco con zapatero para la entrada.",
  dimensions: [
    dim("ancho", "Ancho", M.ancho),
    dim("alto", "Altura", M.alto, { help: "Una consola suele rondar los 80 cm; un banco para sentarse, unos 45 cm." }),
    dim("profundidad", "Profundidad", M.profundidad, { help: "En pasillos angostos conviene una profundidad baja." }),
  ],
  options: [
    {
      key: "tipo",
      label: "Tipo",
      group: "Estructura",
      type: "choice",
      default: "consola",
      choices: [
        { value: "consola", label: "Consola", description: "Mesa angosta sobre patas." },
        { value: "banco", label: "Banco", description: "Para sentarse y dejar el calzado." },
      ],
    },
    legStyleOption((d) => !isBanco(d.options)),
    {
      key: "cajones",
      label: "Cajones bajo la tapa",
      group: "Guardado",
      type: "count",
      min: 0,
      max: 3,
      default: 0,
      unit: ["cajón", "cajones"],
      visibleWhen: (d) => !isBanco(d.options),
    },
    {
      key: "estanteInferior",
      label: "Estante inferior",
      group: "Guardado",
      type: "toggle",
      default: true,
      visibleWhen: (d) => !isBanco(d.options),
    },
    {
      key: "zapatero",
      label: "Estantes para calzado",
      group: "Guardado",
      type: "count",
      min: 1,
      max: 2,
      default: 1,
      unit: ["estante", "estantes"],
      visibleWhen: (d) => isBanco(d.options),
    },
    { ...handleOption, visibleWhen: (d) => !isBanco(d.options) && Number(d.options.cajones) > 0 },
  ],
  templates: [
    { id: "consola", name: "Consola", description: "Patas cónicas y estante inferior.", options: { tipo: "consola", estiloPatas: "conicas", cajones: 0, estanteInferior: true } },
    { id: "consola-cajones", name: "Consola con cajones", description: "Dos cajones bajo la tapa.", options: { tipo: "consola", estiloPatas: "rectas", cajones: 2, estanteInferior: false, tirador: "perilla" } },
    { id: "banco", name: "Banco zapatero", description: "Banco con estante para el calzado.", dimensions: { alto: 46, profundidad: 35, ancho: 100 }, options: { tipo: "banco", zapatero: 1 } },
  ],
  defaultTemplateId: "consola",
  build: (d) => {
    const W = d.dimensions.ancho;
    const D = d.dimensions.profundidad;
    const H = d.dimensions.alto;
    const legH = H - TOP;
    const parts: Part[] = [];
    if (isBanco(d.options)) {
      const t = 4;
      parts.push(box("asiento", [0, H - t / 2, 0], [W, t, D], "x", "wood", { cornerRadius: 1 }));
      parts.push(box("lateral-izq", [-W / 2 + 2 + t / 2, (H - t) / 2, 0], [t, H - t, D - 2], "y"));
      parts.push(box("lateral-der", [W / 2 - 2 - t / 2, (H - t) / 2, 0], [t, H - t, D - 2], "y"));
      const n = opt(d.options, "zapatero", 1) as number;
      const inner = W - 4 - 2 * t;
      for (let i = 0; i < n; i++) {
        const y = 6 + (i * (H - t - 6)) / (n + 0.6);
        parts.push(box(`estante-${i}`, [0, y + BOARD / 2, 0], [inner, BOARD, D - 4], "x"));
      }
      return parts;
    }
    parts.push(box("tapa", [0, H - TOP / 2, 0], [W, TOP, D], "x", "wood", { cornerRadius: 1 }));
    const section = 4.5;
    const inset = 2;
    parts.push(...cornerLegs("pata", opt(d.options, "estiloPatas", "conicas") as LegStyle, W, D, legH, inset, section));
    const cajones = opt(d.options, "cajones", 0) as number;
    const xIn = W / 2 - inset - section;
    const zIn = D / 2 - inset - section / 2;
    if (cajones > 0) {
      parts.push(boxFrom("cajonera-piso", [-xIn, legH - DRAWER_H, -zIn], [2 * xIn, BOARD, 2 * zIn], "x"));
      parts.push(boxFrom("cajonera-fondo", [-xIn, legH - DRAWER_H, -zIn], [2 * xIn, DRAWER_H, BOARD], "x"));
      const step = (2 * xIn) / cajones;
      for (let i = 0; i < cajones; i++) {
        parts.push(
          ...front(
            `cajon-${i}`,
            { x0: -xIn + i * step, x1: -xIn + (i + 1) * step, y0: legH - DRAWER_H, y1: legH },
            zIn - BOARD,
            opt(d.options, "tirador", "unero") as HandleStyle,
            "cajon",
          ),
        );
      }
    } else {
      parts.push(box("faldon-frente", [0, legH - 4, zIn], [2 * xIn, 8, 2], "x"));
      parts.push(box("faldon-atras", [0, legH - 4, -zIn], [2 * xIn, 8, 2], "x"));
    }
    if (opt(d.options, "estanteInferior", true)) {
      parts.push(box("estante", [0, 15, 0], [2 * xIn, BOARD, 2 * zIn + section - 1], "x"));
    }
    return parts;
  },
  incompatibilities: (d) => {
    const issues: Issue[] = [];
    if (!isBanco(d.options) && Number(d.options.cajones) > 0 && d.dimensions.alto < 55) {
      issues.push({ field: "alto", message: "Para sumar cajones, la consola necesita al menos 55 cm de altura." });
    }
    if (!isBanco(d.options) && Number(d.options.cajones) > 0 && d.dimensions.ancho / Number(d.options.cajones) < 30) {
      issues.push({ field: "cajones", message: "Los cajones quedan muy angostos para ese ancho. Probá con menos cajones." });
    }
    return issues;
  },
  reviewRules: (d) => {
    const issues: Issue[] = [];
    if (isBanco(d.options) && (d.dimensions.alto > 55 || d.dimensions.alto < 38)) {
      issues.push({ field: "alto", message: "Es una altura poco habitual para sentarse; el equipo lo confirmará con vos." });
    }
    return issues;
  },
};
