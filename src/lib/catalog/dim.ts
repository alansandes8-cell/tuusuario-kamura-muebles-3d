import type { MedidaConfig } from "@/config/medidas";
import type { DimensionSpec } from "./types";

/** Construye la especificación de una medida a partir de la configuración editable. */
export function dim(
  key: string,
  label: string,
  cfg: MedidaConfig,
  extra: Partial<Omit<DimensionSpec, "key" | "label">> = {},
): DimensionSpec {
  return {
    key,
    label,
    default: cfg.default,
    min: cfg.min,
    max: cfg.max,
    step: cfg.step ?? 1,
    reviewAbove: cfg.reviewAbove,
    reviewBelow: cfg.reviewBelow,
    ...extra,
  };
}
