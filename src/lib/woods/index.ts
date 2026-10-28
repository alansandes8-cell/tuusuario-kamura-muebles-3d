import { DEFAULT_WOOD, MADERAS, type WoodSpecies } from "@/config/maderas";

export { DEFAULT_WOOD, MADERAS as WOODS, WOOD_DISCLAIMER } from "@/config/maderas";
export type { WoodSpecies, WoodTextureParams } from "@/config/maderas";

const byId = new Map(MADERAS.map((w) => [w.id, w]));

export function getWood(id: string): WoodSpecies | undefined {
  return byId.get(id);
}

export function isWoodId(id: string): boolean {
  return byId.has(id);
}

export function woodOrDefault(id: string): WoodSpecies {
  return byId.get(id) ?? byId.get(DEFAULT_WOOD)!;
}

/** Normaliza texto para comparar nombres ("Paraíso" → "paraiso"). */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export function findWoodByName(name: string): WoodSpecies | undefined {
  const n = normalizeText(name);
  return MADERAS.find((w) => w.id === n || normalizeText(w.name) === n);
}
