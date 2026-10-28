import { getCategory } from "@/lib/catalog";
import { boundingBox } from "@/lib/catalog/parts";
import { woodOrDefault } from "@/lib/woods";
import type { Design } from "./design";
import { formatCm, formatOptionValue, visibleDimensions, visibleOptions } from "./visibility";

export interface SummaryLine {
  label: string;
  value: string;
}

export interface DesignSummary {
  category: string;
  template: string;
  wood: string;
  dimensions: SummaryLine[];
  /** Medidas exteriores totales calculadas del modelo. */
  overall: { ancho: number; alto: number; profundidad: number };
  options: SummaryLine[];
  details: SummaryLine[];
}

export function summarizeDesign(design: Design): DesignSummary {
  const cat = getCategory(design.category)!;
  const template = cat.templates.find((t) => t.id === design.templateId);
  const bb = boundingBox(cat.build(design));
  const round = (n: number) => Math.round(n * 10) / 10;
  const details: SummaryLine[] = [];
  if (design.details.preferencias.trim()) details.push({ label: "Preferencias", value: design.details.preferencias.trim() });
  if (design.details.notas.trim()) details.push({ label: "Observaciones para el carpintero", value: design.details.notas.trim() });
  if (design.details.referencia.trim()) details.push({ label: "Referencia de inspiración", value: design.details.referencia.trim() });
  return {
    category: cat.singular.charAt(0).toUpperCase() + cat.singular.slice(1),
    template: template?.name ?? "Personalizado",
    wood: woodOrDefault(design.wood).name,
    dimensions: visibleDimensions(design).map((d) => ({ label: d.label, value: formatCm(design.dimensions[d.key]) })),
    overall: { ancho: round(bb.size[0]), alto: round(bb.size[1]), profundidad: round(bb.size[2]) },
    options: visibleOptions(design)
      .filter((o) => o.group !== "Vista")
      .map((o) => ({ label: o.label, value: formatOptionValue(o, design.options[o.key]) })),
    details,
  };
}

/** Resumen en texto plano (para correos, exportaciones y el panel). */
export function summaryText(design: Design): string {
  const s = summarizeDesign(design);
  const lines = [
    `Mueble: ${s.category} (estilo de partida: ${s.template})`,
    `Madera: ${s.wood}`,
    "Medidas:",
    ...s.dimensions.map((l) => `  - ${l.label}: ${l.value}`),
    `  - Medidas exteriores aproximadas: ${s.overall.ancho} × ${s.overall.profundidad} × ${s.overall.alto} cm (ancho × profundidad × alto)`,
    "Opciones:",
    ...s.options.map((l) => `  - ${l.label}: ${l.value}`),
  ];
  if (s.details.length) {
    lines.push("Detalles:", ...s.details.map((l) => `  - ${l.label}: ${l.value}`));
  }
  return lines.join("\n");
}
