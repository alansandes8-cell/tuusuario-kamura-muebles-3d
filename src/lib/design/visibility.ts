import { getCategory } from "@/lib/catalog";
import type { DimensionSpec, OptionSpec } from "@/lib/catalog";
import type { Design } from "./design";

export function visibleDimensions(design: Design): DimensionSpec[] {
  const cat = getCategory(design.category)!;
  return cat.dimensions.filter((d) => !d.visibleWhen || d.visibleWhen(design));
}

export function visibleOptions(design: Design): OptionSpec[] {
  const cat = getCategory(design.category)!;
  return cat.options.filter((o) => !o.visibleWhen || o.visibleWhen(design));
}

export function formatCm(n: number): string {
  return `${Number.isInteger(n) ? n : n.toFixed(1).replace(".", ",")} cm`;
}

export function formatOptionValue(spec: OptionSpec, value: unknown): string {
  if (spec.type === "toggle") return value ? "Sí" : "No";
  if (spec.type === "count") {
    const n = Number(value);
    return `${n} ${n === 1 ? spec.unit[0] : spec.unit[1]}`;
  }
  return spec.choices.find((c) => c.value === value)?.label ?? String(value);
}
