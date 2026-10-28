import { MEDIDAS } from "@/config/medidas";
import { dim } from "../dim";
import {
  BOARD,
  box,
  boxFrom,
  cabinetFronts,
  carcass,
  clamp,
  cornerLegs,
  dividers,
  handleOption,
  legStyleOption,
  opt,
  translate,
  type FrontMode,
  type HandleStyle,
  type LegStyle,
} from "../parts";
import type { CategoryDefinition, Issue, Part } from "../types";

const M = MEDIDAS.barra;
const TOP = 4;
const OVERHANG = 25;

const isIsla = (o: Record<string, unknown>) => o.tipo === "isla";

export const barra: CategoryDefinition = {
  id: "barra",
  slug: "barras-e-islas",
  name: "Barras e islas",
  singular: "barra",
  article: "la",
  tagline: "Cocinar, desayunar y charlar alrededor.",
  description:
    "Diseñá una barra o una isla de cocina en madera: medidas, voladizo para banquetas, guardado con puertas o cajones.",
  dimensions: [
    dim("largo", "Largo", M.largo),
    dim("profundidad", "Profundidad", M.profundidad, { help: "Incluye el voladizo para las banquetas, si lo elegís." }),
    dim("alto", "Altura", M.alto, { help: "Para banquetas altas suele rondar 105 cm; para una isla de trabajo, alrededor de 90 cm." }),
  ],
  options: [
    {
      key: "tipo",
      label: "Tipo",
      group: "Estructura",
      type: "choice",
      default: "barra",
      choices: [
        { value: "barra", label: "Barra", description: "Tapa sobre patas, liviana." },
        { value: "isla", label: "Isla", description: "Cuerpo con guardado debajo de la tapa." },
      ],
    },
    legStyleOption((d) => !isIsla(d.options)),
    {
      key: "apoyapies",
      label: "Apoyapiés",
      group: "Estructura",
      type: "toggle",
      default: true,
      visibleWhen: (d) => !isIsla(d.options),
    },
    {
      key: "voladizo",
      label: "Voladizo para banquetas",
      help: "La tapa sobresale de un lado para sentarse con las piernas debajo.",
      group: "Estructura",
      type: "toggle",
      default: true,
      visibleWhen: (d) => isIsla(d.options),
    },
    {
      key: "frente",
      label: "Guardado",
      group: "Guardado",
      type: "choice",
      default: "puertas",
      choices: [
        { value: "abierto", label: "Estantes abiertos" },
        { value: "puertas", label: "Puertas" },
        { value: "cajones", label: "Cajones" },
        { value: "mixto-cajones", label: "Mixto", description: "Cajones al centro y puertas a los costados." },
      ],
      visibleWhen: (d) => isIsla(d.options),
    },
    { ...handleOption, visibleWhen: (d) => isIsla(d.options) && d.options.frente !== "abierto" },
  ],
  templates: [
    { id: "barra-patas", name: "Barra con patas", description: "Tapa alta sobre patas con apoyapiés.", options: { tipo: "barra", estiloPatas: "rectas", apoyapies: true } },
    { id: "isla-guardado", name: "Isla con guardado", description: "Cuerpo con puertas bajo la tapa.", dimensions: { alto: 90, profundidad: 60 }, options: { tipo: "isla", voladizo: false, frente: "puertas", tirador: "barra" } },
    { id: "isla-voladizo", name: "Isla con voladizo", description: "Guardado de un lado y banquetas del otro.", dimensions: { alto: 92, profundidad: 90, largo: 180 }, options: { tipo: "isla", voladizo: true, frente: "mixto-cajones", tirador: "unero" } },
  ],
  defaultTemplateId: "barra-patas",
  build: (d) => {
    const L = d.dimensions.largo;
    const D = d.dimensions.profundidad;
    const H = d.dimensions.alto;
    const parts: Part[] = [box("tapa", [0, H - TOP / 2, 0], [L, TOP, D], "x", "wood", { cornerRadius: 1.5 })];
    const legH = H - TOP;
    if (!isIsla(d.options)) {
      const s = 7;
      const inset = 5;
      parts.push(...cornerLegs("pata", opt(d.options, "estiloPatas", "rectas") as LegStyle, L, D, legH, inset, s));
      const xIn = L / 2 - inset - s;
      const zIn = D / 2 - inset - s / 2;
      parts.push(box("faldon-frente", [0, legH - 5, zIn], [2 * xIn, 10, 2.2], "x"));
      parts.push(box("faldon-atras", [0, legH - 5, -zIn], [2 * xIn, 10, 2.2], "x"));
      if (opt(d.options, "apoyapies", true)) {
        parts.push(box("apoyapies", [0, 25, zIn], [2 * xIn, 4, 4], "x"));
        parts.push(box("travesano-izq", [-(L / 2 - inset - s / 2), 25, 0], [4, 4, 2 * zIn - s], "z"));
        parts.push(box("travesano-der", [L / 2 - inset - s / 2, 25, 0], [4, 4, 2 * zIn - s], "z"));
      }
      return parts;
    }
    const overhang = opt(d.options, "voladizo", true) ? OVERHANG : 0;
    const bodyW = L - 4;
    const bodyD = Math.max(30, D - overhang - 2) - BOARD;
    const zBody = D / 2 - 2 - BOARD - bodyD / 2;
    const plinth = 8;
    const bodyH = legH - plinth;
    const columns = clamp(Math.round(bodyW / 50), 2, 5);
    const mode = opt(d.options, "frente", "puertas") as FrontMode;
    parts.push(
      ...translate(
        [
          ...carcass("cuerpo", { w: bodyW, h: bodyH, d: bodyD, y0: plinth, top: false }),
          ...dividers("cuerpo", bodyW, columns, plinth + BOARD, bodyH - BOARD, bodyD),
        ],
        0,
        0,
        zBody,
      ),
    );
    parts.push(boxFrom("zocalo", [-bodyW / 2 + 4, 0, zBody - bodyD / 2 + 2], [bodyW - 8, plinth, bodyD - 6], "x"));
    parts.push(
      ...cabinetFronts("frente", {
        w: bodyW,
        columns,
        y0: plinth + BOARD,
        y1: legH - 1,
        zFront: zBody + bodyD / 2,
        depth: bodyD,
        mode,
        handle: opt(d.options, "tirador", "unero") as HandleStyle,
        drawersPerColumn: 3,
        shelfInOpen: true,
      }),
    );
    return parts;
  },
  incompatibilities: (d) => {
    const issues: Issue[] = [];
    if (isIsla(d.options) && d.options.voladizo && d.dimensions.profundidad < 60) {
      issues.push({ field: "profundidad", message: "Una isla con voladizo necesita al menos 60 cm de profundidad." });
    }
    return issues;
  },
  reviewRules: (d) => {
    const issues: Issue[] = [];
    if (isIsla(d.options)) {
      issues.push({ message: "Si la isla va a tener bacha, anafe o instalaciones, contalo en las observaciones para que el equipo lo evalúe." });
    }
    return issues;
  },
};
