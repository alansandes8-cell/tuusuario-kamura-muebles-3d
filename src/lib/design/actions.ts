/**
 * Acciones permitidas sobre un diseño.
 *
 * Son la ÚNICA forma de modificar la configuración, tanto desde la interfaz
 * como desde el asistente de IA. Cada acción se valida y devuelve un resultado
 * explícito: el asistente solo informa un cambio cuando la acción fue aplicada.
 */
import { getCategory, isCategoryId } from "@/lib/catalog";
import type { OptionValue } from "@/lib/catalog";
import { findWoodByName, getWood, normalizeText } from "@/lib/woods";
import { createDesign, defaultDimensions, DETAILS_LIMITS, type Design, type DesignDetails } from "./design";
import { validateDesign } from "./validation";
import { formatCm, formatOptionValue, visibleDimensions, visibleOptions } from "./visibility";

export type DesignAction =
  | { type: "setCategory"; category: string; templateId?: string }
  | { type: "applyTemplate"; templateId: string }
  | { type: "setDimension"; key: string; value: number }
  | { type: "resetDimensions" }
  | { type: "setWood"; wood: string }
  | { type: "setOption"; key: string; value: OptionValue }
  | { type: "setDetails"; patch: Partial<DesignDetails> };

export type ActionResult =
  | { ok: true; design: Design; summary: string; warnings: string[] }
  | { ok: false; error: string };

const fail = (error: string): ActionResult => ({ ok: false, error });

function success(prev: Design, design: Design, summary: string): ActionResult {
  // Si la acción generó una combinación incompatible nueva, se rechaza.
  const before = new Set(validateDesign(prev).errors.map((e) => e.message));
  const after = validateDesign(design);
  const newErrors = after.errors.filter((e) => !before.has(e.message));
  if (newErrors.length > 0) return fail(newErrors.map((e) => e.message).join(" "));
  return { ok: true, design, summary, warnings: after.warnings.map((w) => w.message) };
}

export function applyAction(design: Design, action: DesignAction): ActionResult {
  const cat = getCategory(design.category)!;
  switch (action.type) {
    case "setCategory": {
      if (!isCategoryId(action.category)) return fail("Esa categoría de mueble no existe.");
      const target = getCategory(action.category)!;
      if (action.templateId && !target.templates.some((t) => t.id === action.templateId)) {
        return fail(`La plantilla "${action.templateId}" no existe para ${target.name.toLowerCase()}.`);
      }
      const next = createDesign(target.id, action.templateId, design.wood);
      next.details = design.details;
      return success(design, next, `Mueble: ${target.singular}`);
    }
    case "applyTemplate": {
      const template = cat.templates.find((t) => t.id === action.templateId || normalizeText(t.name) === normalizeText(action.templateId));
      if (!template) {
        return fail(`No existe esa plantilla. Las disponibles son: ${cat.templates.map((t) => t.name).join(", ")}.`);
      }
      const next = createDesign(cat.id, template.id, design.wood);
      next.details = design.details;
      return success(design, next, `Estilo: ${template.name}`);
    }
    case "setDimension": {
      const spec = cat.dimensions.find((d) => d.key === action.key);
      if (!spec) return fail(`Este mueble no tiene la medida "${action.key}".`);
      if (!visibleDimensions(design).some((d) => d.key === spec.key)) {
        return fail(`La medida "${spec.label}" no aplica con la configuración actual.`);
      }
      const value = Math.round(Number(action.value) * 10) / 10;
      if (!Number.isFinite(value)) return fail("La medida tiene que ser un número.");
      if (value < spec.min || value > spec.max) {
        return fail(`${spec.label} debe estar entre ${formatCm(spec.min)} y ${formatCm(spec.max)}.`);
      }
      return success(design, { ...design, dimensions: { ...design.dimensions, [spec.key]: value } }, `${spec.label}: ${formatCm(value)}`);
    }
    case "resetDimensions": {
      const template = cat.templates.find((t) => t.id === design.templateId);
      const dims = { ...defaultDimensions(cat), ...(template?.dimensions ?? {}) };
      return success(design, { ...design, dimensions: dims }, "Medidas sugeridas restauradas");
    }
    case "setWood": {
      const wood = getWood(action.wood) ?? findWoodByName(action.wood);
      if (!wood) return fail("Esa madera no está disponible. Podés elegir entre Petiribí, Lapacho, Incienso, Guayubira, Guatambú y Paraíso.");
      return success(design, { ...design, wood: wood.id }, `Madera: ${wood.name}`);
    }
    case "setOption": {
      const spec = cat.options.find((o) => o.key === action.key);
      if (!spec) return fail(`Este mueble no tiene la opción "${action.key}".`);
      if (!visibleOptions(design).some((o) => o.key === spec.key)) {
        return fail(`"${spec.label}" no aplica con la configuración actual.`);
      }
      let value: OptionValue = action.value;
      if (spec.type === "choice") {
        const choice = spec.choices.find(
          (c) => c.value === String(value) || normalizeText(c.label) === normalizeText(String(value)),
        );
        if (!choice) return fail(`Para "${spec.label}" las opciones son: ${spec.choices.map((c) => c.label).join(", ")}.`);
        value = choice.value;
      } else if (spec.type === "count") {
        const n = Number(value);
        if (!Number.isInteger(n) || n < spec.min || n > spec.max) {
          return fail(`"${spec.label}" debe ser un número entero entre ${spec.min} y ${spec.max}.`);
        }
        value = n;
      } else {
        if (typeof value === "string") value = ["true", "si", "sí", "1"].includes(normalizeText(value));
        value = Boolean(value);
      }
      return success(
        design,
        { ...design, options: { ...design.options, [spec.key]: value } },
        `${spec.label}: ${formatOptionValue(spec, value)}`,
      );
    }
    case "setDetails": {
      const details = { ...design.details };
      for (const key of Object.keys(action.patch) as (keyof DesignDetails)[]) {
        const v = action.patch[key];
        if (typeof v !== "string") continue;
        if (v.length > DETAILS_LIMITS[key]) return fail(`El texto supera los ${DETAILS_LIMITS[key]} caracteres permitidos.`);
        details[key] = v;
      }
      return { ok: true, design: { ...design, details }, summary: "Detalles actualizados", warnings: [] };
    }
  }
}
