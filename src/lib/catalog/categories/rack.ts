import { MEDIDAS } from "@/config/medidas";
import { dim } from "../dim";
import {
  BOARD,
  boxFrom,
  cabinetFronts,
  carcass,
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
import type { CategoryDefinition, DesignShape, Issue, Part } from "../types";

const M = MEDIDAS.rack;
/** Altura a la que se dibuja un rack colgante (solo visual). */
export const FLOATING_HEIGHT = 30;

function baseHeight(d: DesignShape): number {
  const base = d.options.base;
  if (base === "patas") return d.dimensions.altoPatas;
  if (base === "zocalo") return 8;
  return 0;
}

export const rack: CategoryDefinition = {
  id: "rack",
  slug: "racks-de-tv",
  name: "Racks de TV",
  singular: "rack de TV",
  article: "el",
  tagline: "El centro del living, ordenado.",
  description:
    "Diseñá un rack para TV a medida: ancho, altura y profundidad, módulos abiertos, cajones o puertas, y la madera que más te guste.",
  dimensions: [
    dim("ancho", "Ancho", M.ancho, { help: "Conviene que sea más ancho que el televisor." }),
    dim("alto", "Altura total", M.alto, { help: "Desde el piso (o la base) hasta la parte de arriba." }),
    dim("profundidad", "Profundidad", M.profundidad),
    dim("altoPatas", "Altura de las patas", M.altoPatas, { visibleWhen: (d) => d.options.base === "patas" }),
  ],
  options: [
    {
      key: "modulos",
      label: "Módulos",
      help: "Cantidad de divisiones verticales.",
      group: "Distribución",
      type: "count",
      min: 2,
      max: 5,
      default: 3,
      unit: ["módulo", "módulos"],
    },
    {
      key: "distribucion",
      label: "Frente",
      group: "Distribución",
      type: "choice",
      default: "mixto",
      choices: [
        { value: "abierto", label: "Abierto", description: "Todos los módulos a la vista." },
        { value: "cajones", label: "Cajones", description: "Todos los módulos con cajones." },
        { value: "puertas", label: "Puertas", description: "Todos los módulos cerrados con puertas." },
        { value: "mixto", label: "Mixto", description: "Puertas a los costados y centro abierto." },
      ],
    },
    {
      key: "cajonesPorModulo",
      label: "Cajones por módulo",
      group: "Distribución",
      type: "count",
      min: 1,
      max: 3,
      default: 2,
      unit: ["cajón", "cajones"],
      visibleWhen: (d) => d.options.distribucion === "cajones",
    },
    {
      key: "estanteInterno",
      label: "Estante en los módulos abiertos",
      group: "Distribución",
      type: "toggle",
      default: false,
      visibleWhen: (d) => d.options.distribucion === "abierto" || d.options.distribucion === "mixto",
    },
    {
      key: "base",
      label: "Base",
      group: "Base",
      type: "choice",
      default: "patas",
      choices: [
        { value: "patas", label: "Patas", description: "Liviano a la vista." },
        { value: "zocalo", label: "Zócalo", description: "Apoyado sobre una base retirada." },
        { value: "flotante", label: "Colgante", description: "Se fija a la pared, sin apoyo en el piso." },
      ],
    },
    legStyleOption((d) => d.options.base === "patas"),
    { ...handleOption, visibleWhen: (d) => d.options.distribucion !== "abierto" },
  ],
  templates: [
    {
      id: "nordico",
      name: "Nórdico",
      description: "Sobre patas cónicas, con puertas a los costados y centro abierto.",
      options: { base: "patas", estiloPatas: "conicas", distribucion: "mixto", modulos: 3, estanteInterno: false, tirador: "unero" },
    },
    {
      id: "cajonera",
      name: "Cajonera baja",
      description: "Módulos con cajones sobre zócalo, mucho guardado.",
      dimensions: { alto: 55 },
      options: { base: "zocalo", distribucion: "cajones", modulos: 3, cajonesPorModulo: 2, tirador: "barra" },
    },
    {
      id: "colgante",
      name: "Colgante",
      description: "Flota sobre el piso, con módulos abiertos.",
      dimensions: { alto: 35, profundidad: 35 },
      options: { base: "flotante", distribucion: "abierto", modulos: 4, estanteInterno: false },
    },
  ],
  defaultTemplateId: "nordico",
  build: (d) => {
    const W = d.dimensions.ancho;
    const D = d.dimensions.profundidad;
    const base = opt(d.options, "base", "patas");
    const baseH = baseHeight(d);
    const y0 = base === "flotante" ? FLOATING_HEIGHT : baseH;
    const bodyH = Math.max(20, base === "flotante" ? d.dimensions.alto : d.dimensions.alto - baseH);
    const mode = opt(d.options, "distribucion", "mixto") as FrontMode;
    const columns = opt(d.options, "modulos", 3) as number;
    const hasFronts = mode !== "abierto";
    const bodyD = hasFronts ? D - BOARD : D;
    const dz = hasFronts ? -BOARD / 2 : 0;
    const parts: Part[] = [
      ...translate(carcass("cuerpo", { w: W, h: bodyH, d: bodyD, y0 }), 0, 0, dz),
      ...translate(dividers("cuerpo", W, columns, y0 + BOARD, bodyH - 2 * BOARD, bodyD), 0, 0, dz),
      ...cabinetFronts("frente", {
        w: W,
        columns,
        y0: y0 + BOARD,
        y1: y0 + bodyH - BOARD,
        zFront: bodyD / 2 + dz,
        depth: bodyD,
        mode,
        handle: opt(d.options, "tirador", "unero") as HandleStyle,
        drawersPerColumn: opt(d.options, "cajonesPorModulo", 2) as number,
        shelfInOpen: opt(d.options, "estanteInterno", false) as boolean,
      }),
    ];
    if (base === "patas") {
      parts.push(...cornerLegs("pata", opt(d.options, "estiloPatas", "conicas") as LegStyle, W, D, baseH, 4, 5));
    } else if (base === "zocalo") {
      parts.push(boxFrom("zocalo", [-W / 2 + 4, 0, -D / 2 + 3], [W - 8, baseH, D - 7], "x"));
    }
    return parts;
  },
  incompatibilities: (d) => {
    const issues: Issue[] = [];
    if (d.options.base !== "flotante" && d.dimensions.alto - baseHeight(d) < 20) {
      issues.push({ field: "alto", message: "Con esa base, el cuerpo del rack queda demasiado bajo. Aumentá la altura total o bajá las patas." });
    }
    const colW = d.dimensions.ancho / Number(d.options.modulos ?? 3);
    if (colW < 25) {
      issues.push({ field: "modulos", message: "Los módulos quedan muy angostos para ese ancho. Probá con menos módulos." });
    }
    return issues;
  },
  reviewRules: (d) => {
    const issues: Issue[] = [];
    const colW = d.dimensions.ancho / Number(d.options.modulos ?? 3);
    if (colW > 90) {
      issues.push({ field: "modulos", message: "Los módulos superan los 90 cm de ancho; el equipo revisará si conviene sumar divisiones." });
    }
    if (d.options.base === "flotante") {
      issues.push({ message: "Los muebles colgantes requieren evaluar el tipo de pared y la fijación." });
    }
    return issues;
  },
};
