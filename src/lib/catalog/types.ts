/**
 * Tipos del catálogo de muebles.
 *
 * Cada categoría define sus propias medidas, opciones, plantillas y una función
 * `build` que transforma la configuración en piezas 3D (geometría paramétrica).
 * Todas las medidas se expresan en centímetros.
 */

export type CategoryId =
  | "mesa"
  | "cama"
  | "rack"
  | "escritorio"
  | "biblioteca"
  | "ratona"
  | "barra"
  | "vajillero"
  | "recibidor";

export type OptionValue = string | number | boolean;

/** Estado mínimo que necesitan las reglas de visibilidad y los constructores. */
export interface DesignShape {
  dimensions: Record<string, number>;
  options: Record<string, OptionValue>;
}

export interface DimensionSpec {
  key: string;
  label: string;
  help?: string;
  default: number;
  min: number;
  max: number;
  step: number;
  /** Por encima de este valor se pide revisión manual de Kamura. */
  reviewAbove?: number;
  /** Por debajo de este valor se pide revisión manual de Kamura. */
  reviewBelow?: number;
  visibleWhen?: (d: DesignShape) => boolean;
  /** Atajos de medidas frecuentes (por ejemplo, tamaños de colchón). */
  presets?: { label: string; value: number }[];
}

export interface ChoiceOption {
  value: string;
  label: string;
  description?: string;
}

interface BaseOptionSpec {
  key: string;
  label: string;
  help?: string;
  /** Grupo visual dentro del paso "Diseño". */
  group?: string;
  visibleWhen?: (d: DesignShape) => boolean;
}

export interface ChoiceOptionSpec extends BaseOptionSpec {
  type: "choice";
  choices: ChoiceOption[];
  default: string;
}

export interface CountOptionSpec extends BaseOptionSpec {
  type: "count";
  min: number;
  max: number;
  default: number;
  /** Texto en singular/plural para mostrar el valor ("1 estante", "3 estantes"). */
  unit: [string, string];
}

export interface ToggleOptionSpec extends BaseOptionSpec {
  type: "toggle";
  default: boolean;
}

export type OptionSpec = ChoiceOptionSpec | CountOptionSpec | ToggleOptionSpec;

export interface TemplateSpec {
  id: string;
  name: string;
  description: string;
  dimensions?: Record<string, number>;
  options?: Record<string, OptionValue>;
}

/** Material lógico de una pieza. El renderer decide su apariencia. */
export type PartMaterial =
  | "wood" // madera elegida
  | "glass" // vidrio de vitrinas
  | "reference" // objeto de referencia (colchón), no se fabrica
  | "shadow"; // interior oscuro / sombra de ranuras

export type Axis = "x" | "y" | "z";

export interface BoxPart {
  kind: "box";
  id: string;
  /** Centro de la pieza [x, y, z] en cm. y = 0 es el piso; z positivo hacia el frente. */
  position: [number, number, number];
  /** Tamaño [ancho(x), alto(y), profundidad(z)] en cm. */
  size: [number, number, number];
  material: PartMaterial;
  /** Dirección de la veta. */
  grain?: Axis;
  /** Radio de esquinas en planta (solo tapas). */
  cornerRadius?: number;
  /** Rotación en radianes [x, y, z]. */
  rotation?: [number, number, number];
}

export interface CylinderPart {
  kind: "cylinder";
  id: string;
  position: [number, number, number];
  radiusTop: number;
  radiusBottom: number;
  height: number;
  /** 4 = sección cuadrada (pata cónica cuadrada), >= 16 = redonda. */
  segments: number;
  material: PartMaterial;
  rotation?: [number, number, number];
}

export type Part = BoxPart | CylinderPart;

export interface Issue {
  /** Campo relacionado (clave de medida u opción), si corresponde. */
  field?: string;
  message: string;
}

export interface CategoryDefinition {
  id: CategoryId;
  /** Segmento de URL. */
  slug: string;
  name: string;
  singular: string;
  /** Género gramatical para textos ("tu mesa" / "tu rack"). */
  article: "la" | "el";
  tagline: string;
  /** Texto descriptivo para SEO y la galería. */
  description: string;
  dimensions: DimensionSpec[];
  options: OptionSpec[];
  templates: TemplateSpec[];
  defaultTemplateId: string;
  build: (d: DesignShape) => Part[];
  /** Advertencias que requieren revisión de Kamura (no bloquean el envío). */
  reviewRules?: (d: DesignShape) => Issue[];
  /** Errores de combinaciones incompatibles (bloquean el envío). */
  incompatibilities?: (d: DesignShape) => Issue[];
}
