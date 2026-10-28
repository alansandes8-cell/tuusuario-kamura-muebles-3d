/**
 * Utilidades compartidas para construir piezas paramétricas.
 *
 * Sistema de coordenadas (cm): origen en el piso, centrado en el mueble.
 * x = ancho, y = alto, z = profundidad (el frente mira hacia +z).
 */
import type {
  Axis,
  BoxPart,
  ChoiceOptionSpec,
  CylinderPart,
  OptionValue,
  Part,
  PartMaterial,
} from "./types";

/** Espesor visual de placa (cm). Es orientativo: Kamura define el espesor real. */
export const BOARD = 1.8;
/** Luz entre frentes de puertas y cajones (cm). */
export const GAP = 0.3;

export function box(
  id: string,
  center: [number, number, number],
  size: [number, number, number],
  grain: Axis = "x",
  material: PartMaterial = "wood",
  extra: Partial<BoxPart> = {},
): BoxPart {
  return { kind: "box", id, position: center, size, grain, material, ...extra };
}

/** Caja definida por su esquina mínima (x0, y0, z0) y su tamaño. */
export function boxFrom(
  id: string,
  min: [number, number, number],
  size: [number, number, number],
  grain: Axis = "x",
  material: PartMaterial = "wood",
): BoxPart {
  return box(
    id,
    [min[0] + size[0] / 2, min[1] + size[1] / 2, min[2] + size[2] / 2],
    size,
    grain,
    material,
  );
}

export function cylinder(
  id: string,
  center: [number, number, number],
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments = 24,
  material: PartMaterial = "wood",
  rotation?: [number, number, number],
): CylinderPart {
  return { kind: "cylinder", id, position: center, radiusTop, radiusBottom, height, segments, material, rotation };
}

export type LegStyle = "rectas" | "conicas" | "torneadas";

/**
 * Cuatro patas ubicadas en las esquinas de un rectángulo de ancho `w` y
 * profundidad `d`, retiradas `inset` cm del borde, desde el piso hasta `h`.
 */
export function cornerLegs(
  prefix: string,
  style: LegStyle,
  w: number,
  d: number,
  h: number,
  inset: number,
  section = 5,
): Part[] {
  const xs = [-w / 2 + inset + section / 2, w / 2 - inset - section / 2];
  const zs = [-d / 2 + inset + section / 2, d / 2 - inset - section / 2];
  const parts: Part[] = [];
  let i = 0;
  for (const x of xs) {
    for (const z of zs) {
      parts.push(leg(`${prefix}-${i++}`, style, x, z, h, section));
    }
  }
  return parts;
}

export function leg(id: string, style: LegStyle, x: number, z: number, h: number, section = 5): Part {
  if (style === "rectas") return box(id, [x, h / 2, z], [section, h, section], "y");
  if (style === "conicas") {
    // Pata cuadrada que se afina hacia el piso: cilindro de 4 lados rotado 45°.
    const rTop = (section / 2) * Math.SQRT2;
    return cylinder(id, [x, h / 2, z], rTop, rTop * 0.55, h, 4, "wood", [0, Math.PI / 4, 0]);
  }
  return cylinder(id, [x, h / 2, z], section / 2, (section / 2) * 0.7, h, 24);
}

export interface CarcassOptions {
  w: number;
  h: number;
  d: number;
  /** Altura desde el piso de la cara inferior. */
  y0: number;
  back?: boolean;
  top?: boolean;
}

/** Cuerpo de un mueble: laterales, piso, techo y fondo. */
export function carcass(prefix: string, o: CarcassOptions): Part[] {
  const { w, h, d, y0 } = o;
  const t = BOARD;
  const parts: Part[] = [
    boxFrom(`${prefix}-lateral-izq`, [-w / 2, y0, -d / 2], [t, h, d], "y"),
    boxFrom(`${prefix}-lateral-der`, [w / 2 - t, y0, -d / 2], [t, h, d], "y"),
    boxFrom(`${prefix}-piso`, [-w / 2 + t, y0, -d / 2], [w - 2 * t, t, d], "x"),
  ];
  if (o.top !== false) {
    parts.push(boxFrom(`${prefix}-techo`, [-w / 2, y0 + h - t, -d / 2], [w, t, d], "x"));
  }
  if (o.back !== false) {
    parts.push(boxFrom(`${prefix}-fondo`, [-w / 2 + t, y0 + t, -d / 2], [w - 2 * t, h - 2 * t, 1], "x"));
  }
  return parts;
}

/** Divisiones verticales que reparten el ancho interior en `columns` columnas. */
export function columnBounds(w: number, columns: number): { x0: number; x1: number }[] {
  const t = BOARD;
  const inner = w - 2 * t;
  const colW = (inner - (columns - 1) * t) / columns;
  const out: { x0: number; x1: number }[] = [];
  for (let c = 0; c < columns; c++) {
    const x0 = -w / 2 + t + c * (colW + t);
    out.push({ x0, x1: x0 + colW });
  }
  return out;
}

export function dividers(prefix: string, w: number, columns: number, y0: number, h: number, d: number): Part[] {
  const cols = columnBounds(w, columns);
  const parts: Part[] = [];
  for (let c = 0; c < columns - 1; c++) {
    parts.push(boxFrom(`${prefix}-division-${c}`, [cols[c].x1, y0, -d / 2 + 1], [BOARD, h, d - 1], "y"));
  }
  return parts;
}

export type HandleStyle = "unero" | "perilla" | "barra";

export const handleOption: ChoiceOptionSpec = {
  key: "tirador",
  label: "Tiradores",
  group: "Terminaciones",
  type: "choice",
  default: "unero",
  choices: [
    { value: "unero", label: "Uñero", description: "Ranura para tomar con los dedos, sin herrajes a la vista." },
    { value: "perilla", label: "Perilla de madera", description: "Pequeño botón torneado." },
    { value: "barra", label: "Barra de madera", description: "Tirador horizontal alargado." },
  ],
};

/**
 * Frente (puerta o cajón) superpuesto al cuerpo, con su tirador.
 * `rect` es el hueco a cubrir en x/y; z0 es la cara frontal del cuerpo.
 */
export function front(
  id: string,
  rect: { x0: number; x1: number; y0: number; y1: number },
  z0: number,
  handle: HandleStyle,
  kind: "cajon" | "puerta-izq" | "puerta-der",
  material: PartMaterial = "wood",
): Part[] {
  const x0 = rect.x0 + GAP / 2;
  const x1 = rect.x1 - GAP / 2;
  const y0 = rect.y0 + GAP / 2;
  const y1 = rect.y1 - GAP / 2;
  const w = x1 - x0;
  const h = y1 - y0;
  const parts: Part[] = [];
  if (material === "glass") {
    // Puerta vidriada: marco de madera y vidrio central.
    const f = Math.min(5, w / 4);
    parts.push(boxFrom(`${id}-marco-sup`, [x0, y1 - f, z0], [w, f, BOARD], "x"));
    parts.push(boxFrom(`${id}-marco-inf`, [x0, y0, z0], [w, f, BOARD], "x"));
    parts.push(boxFrom(`${id}-marco-izq`, [x0, y0 + f, z0], [f, h - 2 * f, BOARD], "y"));
    parts.push(boxFrom(`${id}-marco-der`, [x1 - f, y0 + f, z0], [f, h - 2 * f, BOARD], "y"));
    parts.push(boxFrom(`${id}-vidrio`, [x0 + f, y0 + f, z0 + 0.6], [w - 2 * f, h - 2 * f, 0.4], "x", "glass"));
  } else {
    parts.push(boxFrom(id, [x0, y0, z0], [w, h, BOARD], kind === "cajon" ? "x" : "y"));
  }
  const zf = z0 + BOARD;
  const cx = kind === "puerta-izq" ? x1 - 4 : kind === "puerta-der" ? x0 + 4 : (x0 + x1) / 2;
  const cy = kind === "cajon" ? y1 - Math.min(4, h / 3) : (y0 + y1) / 2;
  if (handle === "perilla") {
    parts.push(cylinder(`${id}-perilla`, [cx, cy, zf + 1.2], 1.4, 1.1, 2.4, 20, "wood", [Math.PI / 2, 0, 0]));
  } else if (handle === "barra") {
    if (kind === "cajon") {
      const bw = Math.min(w * 0.45, 32);
      parts.push(box(`${id}-barra`, [cx, cy, zf + 1], [bw, 1.6, 2], "x"));
    } else {
      const bh = Math.min(h * 0.4, 30);
      parts.push(box(`${id}-barra`, [cx, cy, zf + 1], [1.6, bh, 2], "y"));
    }
  } else if (material !== "glass") {
    // Uñero: ranura oscura sobre el canto superior del cajón o lateral de la puerta.
    if (kind === "cajon") {
      parts.push(box(`${id}-unero`, [(x0 + x1) / 2, y1 - 0.9, zf + 0.01], [Math.min(w * 0.5, 30), 1.6, 0.05], "x", "shadow"));
    } else {
      const ux = kind === "puerta-izq" ? x1 - 0.9 : x0 + 0.9;
      parts.push(box(`${id}-unero`, [ux, (y0 + y1) / 2, zf + 0.01], [1.6, Math.min(h * 0.5, 30), 0.05], "y", "shadow"));
    }
  }
  return parts;
}

/** Reparte una altura en `n` tramos iguales (devuelve los límites). */
export function splitRange(a: number, b: number, n: number): { y0: number; y1: number }[] {
  const step = (b - a) / n;
  return Array.from({ length: n }, (_, i) => ({ y0: a + i * step, y1: a + (i + 1) * step }));
}

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Lectura tipada de opciones con valor por defecto. */
export function opt(options: Record<string, OptionValue>, key: string, fallback: string): string;
export function opt(options: Record<string, OptionValue>, key: string, fallback: number): number;
export function opt(options: Record<string, OptionValue>, key: string, fallback: boolean): boolean;
export function opt(options: Record<string, OptionValue>, key: string, fallback: OptionValue): OptionValue {
  const v = options[key];
  return v === undefined ? fallback : v;
}

/** Caja contenedora de todas las piezas (cm). */
export function boundingBox(parts: Part[]) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    if (p.material === "reference") continue;
    let half: [number, number, number];
    if (p.kind === "box") {
      half = [p.size[0] / 2, p.size[1] / 2, p.size[2] / 2];
      if (p.rotation && p.rotation[1] !== 0) {
        const r = Math.max(half[0], half[2]);
        half = [r, half[1], r];
      }
    } else {
      const r = Math.max(p.radiusTop, p.radiusBottom);
      half = [r, p.height / 2, r];
    }
    for (let i = 0; i < 3; i++) {
      min[i] = Math.min(min[i], p.position[i] - half[i]);
      max[i] = Math.max(max[i], p.position[i] + half[i]);
    }
  }
  return {
    min: min as [number, number, number],
    max: max as [number, number, number],
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] as [number, number, number],
  };
}

/** Desplaza un conjunto de piezas. */
export function translate(parts: Part[], dx: number, dy: number, dz: number): Part[] {
  return parts.map((p) => ({
    ...p,
    position: [p.position[0] + dx, p.position[1] + dy, p.position[2] + dz] as [number, number, number],
  }));
}

export type FrontMode = "abierto" | "puertas" | "cajones" | "mixto" | "mixto-cajones";
type ColumnKind = "abierto" | "puerta" | "cajones";

export function columnKind(mode: FrontMode, c: number, columns: number): ColumnKind {
  const edge = c === 0 || c === columns - 1;
  switch (mode) {
    case "abierto":
      return "abierto";
    case "puertas":
      return "puerta";
    case "cajones":
      return "cajones";
    case "mixto":
      // Puertas a los costados, centro abierto.
      if (columns === 2) return c === 0 ? "puerta" : "abierto";
      return edge ? "puerta" : "abierto";
    case "mixto-cajones":
      // Puertas a los costados, cajones al centro.
      if (columns === 2) return c === 0 ? "cajones" : "puerta";
      return edge ? "puerta" : "cajones";
  }
}

export interface CabinetFrontOptions {
  /** Ancho total del cuerpo. */
  w: number;
  columns: number;
  /** Límites interiores (entre piso y techo del cuerpo). */
  y0: number;
  y1: number;
  /** Cara frontal del cuerpo. */
  zFront: number;
  /** Profundidad interior, para estantes de columnas abiertas. */
  depth: number;
  mode: FrontMode;
  handle: HandleStyle;
  drawersPerColumn?: number;
  shelfInOpen?: boolean;
  glassDoors?: boolean;
}

/** Puertas, cajones y estantes de un cuerpo dividido en columnas. */
export function cabinetFronts(prefix: string, o: CabinetFrontOptions): Part[] {
  const cols = columnBounds(o.w, o.columns);
  const parts: Part[] = [];
  cols.forEach((col, c) => {
    const kind = columnKind(o.mode, c, o.columns);
    const rx0 = col.x0 - (c === 0 ? BOARD : BOARD / 2);
    const rx1 = col.x1 + (c === o.columns - 1 ? BOARD : BOARD / 2);
    const ry0 = o.y0 - BOARD;
    const ry1 = o.y1 + BOARD;
    if (kind === "abierto") {
      if (o.shelfInOpen) {
        const ym = (o.y0 + o.y1) / 2;
        parts.push(boxFrom(`${prefix}-estante-${c}`, [col.x0, ym - BOARD / 2, o.zFront - o.depth], [col.x1 - col.x0, BOARD, o.depth - 1], "x"));
      }
      return;
    }
    if (kind === "puerta") {
      const hinge = c < o.columns / 2 ? "puerta-izq" : "puerta-der";
      parts.push(
        ...front(`${prefix}-puerta-${c}`, { x0: rx0, x1: rx1, y0: ry0, y1: ry1 }, o.zFront, o.handle, hinge, o.glassDoors ? "glass" : "wood"),
      );
      return;
    }
    const n = Math.max(1, o.drawersPerColumn ?? 2);
    splitRange(ry0, ry1, n).forEach((r, i) => {
      parts.push(...front(`${prefix}-cajon-${c}-${i}`, { x0: rx0, x1: rx1, y0: r.y0, y1: r.y1 }, o.zFront, o.handle, "cajon"));
    });
  });
  return parts;
}

export const legStyleOption = (visibleWhen?: (d: { options: Record<string, OptionValue> }) => boolean): ChoiceOptionSpec => ({
  key: "estiloPatas",
  label: "Estilo de patas",
  group: "Base",
  type: "choice",
  default: "conicas",
  choices: [
    { value: "conicas", label: "Cónicas", description: "Se afinan hacia el piso. Livianas y modernas." },
    { value: "rectas", label: "Rectas", description: "Sección cuadrada, firmes y simples." },
    { value: "torneadas", label: "Redondas", description: "Sección circular, apenas afinada." },
  ],
  visibleWhen: visibleWhen as ChoiceOptionSpec["visibleWhen"],
});
