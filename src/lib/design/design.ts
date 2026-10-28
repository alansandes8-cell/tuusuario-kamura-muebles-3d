/**
 * Formato estructurado y versionado de un diseño.
 *
 * Es lo que se guarda en el navegador, en los enlaces de recuperación y en cada
 * solicitud de cotización. Cuando cambie el formato, subir DESIGN_SCHEMA_VERSION
 * y agregar la migración correspondiente en `migrateDesign`.
 */
import { z } from "zod";
import { CATEGORY_IDS, getCategory } from "@/lib/catalog";
import type { CategoryDefinition, CategoryId, OptionValue } from "@/lib/catalog";
import { DEFAULT_WOOD, isWoodId } from "@/lib/woods";

export const DESIGN_SCHEMA_VERSION = 1;

export interface DesignDetails {
  /** Observaciones para el carpintero. */
  notas: string;
  /** Preferencias de diseño o requisitos particulares. */
  preferencias: string;
  /** Enlace a una referencia de inspiración. */
  referencia: string;
}

export interface Design {
  schemaVersion: typeof DESIGN_SCHEMA_VERSION;
  category: CategoryId;
  templateId: string;
  wood: string;
  dimensions: Record<string, number>;
  options: Record<string, OptionValue>;
  details: DesignDetails;
}

export const DETAILS_LIMITS = { notas: 1500, preferencias: 1000, referencia: 500 } as const;

export const emptyDetails = (): DesignDetails => ({ notas: "", preferencias: "", referencia: "" });

const detailsSchema = z.object({
  notas: z.string().max(DETAILS_LIMITS.notas).default(""),
  preferencias: z.string().max(DETAILS_LIMITS.preferencias).default(""),
  referencia: z.string().max(DETAILS_LIMITS.referencia).default(""),
});

/** Esquema para datos de entrada no confiables (navegador, API). */
export const designInputSchema = z.object({
  schemaVersion: z.number().int().positive(),
  category: z.enum(CATEGORY_IDS),
  templateId: z.string().max(60),
  wood: z.string().max(40),
  dimensions: z.record(z.string().max(40), z.number().finite()),
  options: z.record(z.string().max(40), z.union([z.string().max(60), z.number().finite(), z.boolean()])),
  details: detailsSchema.default({}),
});

export function defaultOptions(cat: CategoryDefinition): Record<string, OptionValue> {
  return Object.fromEntries(cat.options.map((o) => [o.key, o.default]));
}

export function defaultDimensions(cat: CategoryDefinition): Record<string, number> {
  return Object.fromEntries(cat.dimensions.map((d) => [d.key, d.default]));
}

/** Crea un diseño nuevo desde una plantilla de la categoría. */
export function createDesign(categoryId: CategoryId, templateId?: string, wood: string = DEFAULT_WOOD): Design {
  const cat = getCategory(categoryId);
  if (!cat) throw new Error(`Categoría desconocida: ${categoryId}`);
  const template = cat.templates.find((t) => t.id === templateId) ?? cat.templates.find((t) => t.id === cat.defaultTemplateId)!;
  return {
    schemaVersion: DESIGN_SCHEMA_VERSION,
    category: cat.id,
    templateId: template.id,
    wood,
    dimensions: { ...defaultDimensions(cat), ...(template.dimensions ?? {}) },
    options: { ...defaultOptions(cat), ...(template.options ?? {}) },
    details: emptyDetails(),
  };
}

/** Convierte versiones anteriores del formato a la actual. */
export function migrateDesign(raw: unknown): unknown {
  // Versión 1 es la inicial. Ejemplo de futura migración:
  // if (raw.schemaVersion === 1) raw = { ...raw, schemaVersion: 2, ... }
  return raw;
}

export type ParseResult = { ok: true; design: Design } | { ok: false; error: string };

/**
 * Lee un diseño no confiable: migra, valida tipos, completa valores nuevos con
 * los predeterminados y descarta claves que la categoría no reconoce.
 * No corrige valores fuera de rango: eso lo informa `validateDesign`.
 */
export function parseDesign(raw: unknown): ParseResult {
  const parsed = designInputSchema.safeParse(migrateDesign(raw));
  if (!parsed.success) return { ok: false, error: "El diseño no tiene un formato válido." };
  const input = parsed.data;
  if (input.schemaVersion > DESIGN_SCHEMA_VERSION) {
    return { ok: false, error: "El diseño fue creado con una versión más nueva del configurador." };
  }
  const cat = getCategory(input.category)!;
  const dimensions = defaultDimensions(cat);
  for (const key of Object.keys(dimensions)) {
    if (typeof input.dimensions[key] === "number") dimensions[key] = input.dimensions[key];
  }
  const options = defaultOptions(cat);
  for (const spec of cat.options) {
    const v = input.options[spec.key];
    if (v === undefined) continue;
    if (spec.type === "toggle" && typeof v === "boolean") options[spec.key] = v;
    if (spec.type === "count" && typeof v === "number") options[spec.key] = v;
    if (spec.type === "choice" && typeof v === "string") options[spec.key] = v;
  }
  const templateId = cat.templates.some((t) => t.id === input.templateId) ? input.templateId : cat.defaultTemplateId;
  return {
    ok: true,
    design: {
      schemaVersion: DESIGN_SCHEMA_VERSION,
      category: cat.id,
      templateId,
      wood: isWoodId(input.wood) ? input.wood : DEFAULT_WOOD,
      dimensions,
      options,
      details: input.details,
    },
  };
}
