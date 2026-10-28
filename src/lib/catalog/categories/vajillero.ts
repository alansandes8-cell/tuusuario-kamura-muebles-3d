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
  legStyleOption,
  opt,
  translate,
  type FrontMode,
  type HandleStyle,
  type LegStyle,
} from "../parts";
import type { CategoryDefinition, Issue, Part } from "../types";

const M = MEDIDAS.vajillero;
const hasUpper = (o: Record<string, unknown>) => o.cuerpoSuperior !== "sin";

export const vajillero: CategoryDefinition = {
  id: "vajillero",
  slug: "vajilleros",
  name: "Vajilleros",
  singular: "vajillero",
  article: "el",
  tagline: "La vajilla de todos los días, a mano y a la vista.",
  description:
    "Diseñá un vajillero o aparador en madera: módulos, puertas o cajones, cuerpo superior abierto o vitrina, y la base que prefieras.",
  dimensions: [
    dim("ancho", "Ancho", M.ancho),
    dim("alto", "Altura del cuerpo inferior", M.alto, { help: "Desde el piso hasta la tapa del mueble bajo." }),
    dim("profundidad", "Profundidad", M.profundidad),
    dim("altoSuperior", "Altura del cuerpo superior", M.altoSuperior, { visibleWhen: (d) => hasUpper(d.options) }),
  ],
  options: [
    { key: "modulos", label: "Módulos", group: "Distribución", type: "count", min: 2, max: 4, default: 3, unit: ["módulo", "módulos"] },
    {
      key: "frente",
      label: "Frente del cuerpo inferior",
      group: "Distribución",
      type: "choice",
      default: "mixto-cajones",
      choices: [
        { value: "puertas", label: "Puertas" },
        { value: "cajones", label: "Cajones" },
        { value: "mixto-cajones", label: "Mixto", description: "Cajones al centro y puertas a los costados." },
      ],
    },
    {
      key: "cuerpoSuperior",
      label: "Cuerpo superior",
      group: "Distribución",
      type: "choice",
      default: "sin",
      choices: [
        { value: "sin", label: "Sin cuerpo superior", description: "Aparador bajo." },
        { value: "estantes", label: "Estantes abiertos", description: "Para exhibir la vajilla." },
        { value: "vitrina", label: "Vitrina", description: "Puertas con vidrio." },
      ],
    },
    {
      key: "base",
      label: "Base",
      group: "Base",
      type: "choice",
      default: "patas",
      choices: [
        { value: "patas", label: "Patas" },
        { value: "zocalo", label: "Zócalo" },
      ],
    },
    legStyleOption((d) => d.options.base === "patas"),
    handleOption,
  ],
  templates: [
    { id: "aparador", name: "Aparador", description: "Mueble bajo con cajones al centro.", options: { cuerpoSuperior: "sin", base: "patas", estiloPatas: "conicas", frente: "mixto-cajones", modulos: 3 } },
    { id: "abierto", name: "Con estantes arriba", description: "Cuerpo superior abierto para exhibir.", options: { cuerpoSuperior: "estantes", base: "zocalo", frente: "puertas", modulos: 3, tirador: "perilla" } },
    { id: "vitrina", name: "Vitrina", description: "Puertas vidriadas arriba y guardado abajo.", dimensions: { altoSuperior: 100 }, options: { cuerpoSuperior: "vitrina", base: "patas", estiloPatas: "rectas", frente: "puertas", modulos: 2, tirador: "barra" } },
  ],
  defaultTemplateId: "aparador",
  build: (d) => {
    const W = d.dimensions.ancho;
    const D = d.dimensions.profundidad;
    const H = d.dimensions.alto;
    const baseH = d.options.base === "patas" ? 15 : 8;
    const bodyH = H - baseH;
    const columns = opt(d.options, "modulos", 3) as number;
    const handle = opt(d.options, "tirador", "unero") as HandleStyle;
    const bodyD = D - BOARD;
    const dz = -BOARD / 2;
    const parts: Part[] = [
      ...translate(
        [
          ...carcass("cuerpo", { w: W, h: bodyH, d: bodyD, y0: baseH }),
          ...dividers("cuerpo", W, columns, baseH + BOARD, bodyH - 2 * BOARD, bodyD),
        ],
        0,
        0,
        dz,
      ),
      ...cabinetFronts("frente", {
        w: W,
        columns,
        y0: baseH + BOARD,
        y1: H - BOARD,
        zFront: bodyD / 2 + dz,
        depth: bodyD,
        mode: opt(d.options, "frente", "mixto-cajones") as FrontMode,
        handle,
        drawersPerColumn: 3,
      }),
    ];
    if (d.options.base === "patas") {
      parts.push(...cornerLegs("pata", opt(d.options, "estiloPatas", "conicas") as LegStyle, W, D, baseH, 4, 5));
    } else {
      parts.push(boxFrom("zocalo", [-W / 2 + 4, 0, -D / 2 + 3], [W - 8, baseH, D - 7], "x"));
    }
    const upper = opt(d.options, "cuerpoSuperior", "sin");
    if (upper !== "sin") {
      const hu = d.dimensions.altoSuperior;
      const ud = Math.min(30, D - 12);
      const uz = -D / 2 + ud / 2;
      const glass = upper === "vitrina";
      const innerD = glass ? ud - BOARD : ud;
      const upperParts: Part[] = [
        ...carcass("superior", { w: W, h: hu, d: innerD, y0: H }),
        ...dividers("superior", W, columns, H + BOARD, hu - 2 * BOARD, innerD),
      ];
      const shelves = Math.max(1, Math.floor(hu / 35));
      columnBounds(W, columns).forEach((c, ci) => {
        for (let s = 1; s <= shelves; s++) {
          const y = H + BOARD + ((hu - 2 * BOARD) * s) / (shelves + 1);
          upperParts.push(boxFrom(`superior-estante-${ci}-${s}`, [c.x0, y, -innerD / 2 + 1], [c.x1 - c.x0, BOARD, innerD - 1.5], "x"));
        }
      });
      parts.push(...translate(upperParts, 0, 0, uz - (glass ? BOARD / 2 : 0)));
      if (glass) {
        parts.push(
          ...cabinetFronts("vitrina", {
            w: W,
            columns,
            y0: H + BOARD,
            y1: H + hu - BOARD,
            zFront: uz - BOARD / 2 + innerD / 2,
            depth: innerD,
            mode: "puertas",
            handle: handle === "unero" ? "perilla" : handle,
            glassDoors: true,
          }),
        );
      }
    }
    return parts;
  },
  incompatibilities: (d) => {
    const issues: Issue[] = [];
    const bodyH = d.dimensions.alto - (d.options.base === "patas" ? 15 : 8);
    if (d.options.frente !== "puertas" && bodyH < 45) {
      issues.push({ field: "alto", message: "Con esa altura no entran tres cajones. Elegí puertas o aumentá la altura." });
    }
    return issues;
  },
  reviewRules: (d) => {
    const issues: Issue[] = [];
    if (hasUpper(d.options) && d.dimensions.alto + d.dimensions.altoSuperior > 200) {
      issues.push({ message: "Los muebles altos suelen fijarse a la pared; el equipo te indicará cómo." });
    }
    return issues;
  },
};
