import { MEDIDAS } from "@/config/medidas";
import { dim } from "../dim";
import {
  BOARD,
  boxFrom,
  cabinetFronts,
  carcass,
  columnBounds,
  cornerLegs,
  dividers,
  handleOption,
  opt,
  translate,
  type HandleStyle,
} from "../parts";
import type { CategoryDefinition, DesignShape, Issue, Part } from "../types";

const M = MEDIDAS.biblioteca;

function layout(d: DesignShape) {
  const baseH = d.options.base === "patas" ? 12 : 8;
  const bodyH = d.dimensions.alto - baseH;
  const closed = d.options.cerrado !== "abierta";
  const closedH = closed ? Math.min(75, bodyH * 0.4) : 0;
  const openBottom = baseH + BOARD + closedH;
  const openTop = d.dimensions.alto - BOARD;
  const shelves = Number(d.options.estantes ?? 4);
  const spacing = (openTop - openBottom - shelves * BOARD) / (shelves + 1);
  return { baseH, bodyH, closed, closedH, openBottom, openTop, shelves, spacing };
}

export const biblioteca: CategoryDefinition = {
  id: "biblioteca",
  slug: "bibliotecas",
  name: "Bibliotecas",
  singular: "biblioteca",
  article: "la",
  tagline: "Libros, objetos y recuerdos en su lugar.",
  description:
    "Diseñá una biblioteca de madera a medida: tamaño, columnas, estantes, distribución regular o asimétrica y módulos cerrados.",
  dimensions: [
    dim("ancho", "Ancho", M.ancho),
    dim("alto", "Altura total", M.alto),
    dim("profundidad", "Profundidad", M.profundidad, { help: "Para libros comunes alcanza con unos 30 cm." }),
  ],
  options: [
    { key: "columnas", label: "Columnas", group: "Distribución", type: "count", min: 1, max: 6, default: 3, unit: ["columna", "columnas"] },
    { key: "estantes", label: "Estantes por columna", group: "Distribución", type: "count", min: 1, max: 8, default: 4, unit: ["estante", "estantes"] },
    {
      key: "distribucion",
      label: "Distribución de estantes",
      group: "Distribución",
      type: "choice",
      default: "regular",
      choices: [
        { value: "regular", label: "Regular", description: "Estantes alineados en todas las columnas." },
        { value: "asimetrica", label: "Asimétrica", description: "Estantes alternados entre columnas." },
      ],
    },
    {
      key: "cerrado",
      label: "Parte inferior",
      group: "Guardado",
      type: "choice",
      default: "abierta",
      choices: [
        { value: "abierta", label: "Abierta", description: "Toda la biblioteca a la vista." },
        { value: "puertas", label: "Con puertas", description: "Módulos inferiores cerrados." },
        { value: "cajones", label: "Con cajones", description: "Cajones en la parte de abajo." },
      ],
    },
    { key: "fondo", label: "Fondo de madera", help: "Sin fondo, se ve la pared detrás.", group: "Terminaciones", type: "toggle", default: true },
    {
      key: "base",
      label: "Base",
      group: "Base",
      type: "choice",
      default: "zocalo",
      choices: [
        { value: "zocalo", label: "Zócalo", description: "Apoyo continuo y retirado." },
        { value: "patas", label: "Patas", description: "Liviana a la vista." },
      ],
    },
    { ...handleOption, visibleWhen: (d) => d.options.cerrado !== "abierta" },
  ],
  templates: [
    { id: "abierta", name: "Abierta", description: "Columnas y estantes regulares, todo a la vista.", options: { columnas: 3, estantes: 4, distribucion: "regular", cerrado: "abierta", fondo: true, base: "zocalo" } },
    { id: "asimetrica", name: "Asimétrica", description: "Estantes alternados para un ritmo más dinámico.", dimensions: { ancho: 160 }, options: { columnas: 4, estantes: 4, distribucion: "asimetrica", cerrado: "abierta", fondo: true, base: "zocalo" } },
    { id: "modulos-cerrados", name: "Con módulos cerrados", description: "Puertas abajo para guardar y estantes arriba.", options: { columnas: 3, estantes: 3, distribucion: "regular", cerrado: "puertas", fondo: true, base: "zocalo", tirador: "unero" } },
  ],
  defaultTemplateId: "abierta",
  build: (d) => {
    const W = d.dimensions.ancho;
    const D = d.dimensions.profundidad;
    const L = layout(d);
    const columns = opt(d.options, "columnas", 3) as number;
    const fondo = opt(d.options, "fondo", true) as boolean;
    const parts: Part[] = [];
    const bodyD = L.closed ? D - BOARD : D;
    const dz = L.closed ? -BOARD / 2 : 0;
    const body: Part[] = [
      ...carcass("cuerpo", { w: W, h: L.bodyH, d: bodyD, y0: L.baseH, back: fondo }),
      ...dividers("cuerpo", W, columns, L.baseH + BOARD, L.bodyH - 2 * BOARD, bodyD),
    ];
    const cols = columnBounds(W, columns);
    const asym = d.options.distribucion === "asimetrica";
    cols.forEach((c, ci) => {
      const offset = asym && ci % 2 === 1 ? (L.spacing + BOARD) / 2 : 0;
      for (let s = 0; s < L.shelves; s++) {
        const y = L.openBottom + L.spacing * (s + 1) + BOARD * s + offset;
        if (y + BOARD > L.openTop - 8) continue;
        body.push(boxFrom(`estante-${ci}-${s}`, [c.x0, y, -bodyD / 2 + 1], [c.x1 - c.x0, BOARD, bodyD - 1.5], "x"));
      }
    });
    if (L.closed) {
      // Estante que separa la zona cerrada de la abierta.
      body.push(boxFrom("estante-division", [-W / 2 + BOARD, L.openBottom - BOARD, -bodyD / 2 + 1], [W - 2 * BOARD, BOARD, bodyD - 1], "x"));
    }
    parts.push(...translate(body, 0, 0, dz));
    if (L.closed) {
      parts.push(
        ...cabinetFronts("frente", {
          w: W,
          columns,
          y0: L.baseH + BOARD,
          y1: L.openBottom - BOARD,
          zFront: bodyD / 2 + dz,
          depth: bodyD,
          mode: d.options.cerrado === "cajones" ? "cajones" : "puertas",
          handle: opt(d.options, "tirador", "unero") as HandleStyle,
          drawersPerColumn: 2,
        }),
      );
    }
    if (d.options.base === "patas") {
      parts.push(...cornerLegs("pata", "conicas", W, D, L.baseH, 3, 5));
      if (W > 150) {
        parts.push(...cornerLegs("pata-central", "conicas", 8, D, L.baseH, 3, 5).slice(0, 2));
      }
    } else {
      parts.push(boxFrom("zocalo", [-W / 2 + 3, 0, -D / 2 + 2], [W - 6, L.baseH, D - 5], "x"));
    }
    return parts;
  },
  incompatibilities: (d) => {
    const issues: Issue[] = [];
    const L = layout(d);
    if (L.closed && d.dimensions.alto < 110) {
      issues.push({ field: "alto", message: "Para sumar módulos cerrados, la biblioteca necesita al menos 110 cm de altura." });
    }
    if (L.spacing < 18) {
      issues.push({ field: "estantes", message: "No entran tantos estantes en esa altura. Probá con menos estantes o más altura." });
    }
    if (d.dimensions.ancho / Number(d.options.columnas ?? 3) < 20) {
      issues.push({ field: "columnas", message: "Las columnas quedan demasiado angostas. Probá con menos columnas o más ancho." });
    }
    return issues;
  },
  reviewRules: (d) => {
    const issues: Issue[] = [];
    if (d.dimensions.ancho / Number(d.options.columnas ?? 3) > 90) {
      issues.push({ field: "columnas", message: "Los estantes superan los 90 cm de largo; el equipo revisará si conviene sumar columnas." });
    }
    if (d.dimensions.alto > 150) {
      issues.push({ message: "Los muebles altos suelen fijarse a la pared; el equipo te indicará cómo." });
    }
    return issues;
  },
};
