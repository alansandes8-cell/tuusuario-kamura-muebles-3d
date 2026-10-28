import { getCategory } from "@/lib/catalog";
import type { Issue } from "@/lib/catalog";
import { getWood } from "@/lib/woods";
import type { Design } from "./design";
import { formatCm, visibleDimensions, visibleOptions } from "./visibility";

export interface ValidationResult {
  /** Impiden enviar la solicitud: valores inválidos o combinaciones incompatibles. */
  errors: Issue[];
  /** No impiden enviar, pero Kamura debe revisar la viabilidad. */
  warnings: Issue[];
}

export function validateDesign(design: Design): ValidationResult {
  const cat = getCategory(design.category);
  if (!cat) return { errors: [{ message: "La categoría del mueble no es válida." }], warnings: [] };
  const errors: Issue[] = [];
  const warnings: Issue[] = [];

  if (!getWood(design.wood)) errors.push({ field: "wood", message: "Elegí una de las maderas disponibles." });

  for (const spec of visibleDimensions(design)) {
    const v = design.dimensions[spec.key];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      errors.push({ field: spec.key, message: `Falta indicar ${spec.label.toLowerCase()}.` });
    } else if (v < spec.min || v > spec.max) {
      errors.push({
        field: spec.key,
        message: `${spec.label} debe estar entre ${formatCm(spec.min)} y ${formatCm(spec.max)}.`,
      });
    } else if ((spec.reviewAbove !== undefined && v > spec.reviewAbove) || (spec.reviewBelow !== undefined && v < spec.reviewBelow)) {
      warnings.push({
        field: spec.key,
        message: `${spec.label} de ${formatCm(v)} es una medida poco habitual: el equipo de Kamura confirmará su viabilidad.`,
      });
    }
  }

  for (const spec of visibleOptions(design)) {
    const v = design.options[spec.key];
    if (spec.type === "choice" && !spec.choices.some((c) => c.value === v)) {
      errors.push({ field: spec.key, message: `Elegí una opción para "${spec.label}".` });
    }
    if (spec.type === "count" && (typeof v !== "number" || !Number.isInteger(v) || v < spec.min || v > spec.max)) {
      errors.push({ field: spec.key, message: `"${spec.label}" debe estar entre ${spec.min} y ${spec.max}.` });
    }
    if (spec.type === "toggle" && typeof v !== "boolean") {
      errors.push({ field: spec.key, message: `"${spec.label}" no tiene un valor válido.` });
    }
  }

  // Las reglas de cada categoría solo tienen sentido con valores válidos.
  if (errors.length === 0) {
    errors.push(...(cat.incompatibilities?.(design) ?? []));
    warnings.push(...(cat.reviewRules?.(design) ?? []));
  }
  return { errors, warnings };
}

export function isSubmittable(design: Design): boolean {
  return validateDesign(design).errors.length === 0;
}
