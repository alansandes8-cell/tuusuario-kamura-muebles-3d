import { barra } from "./categories/barra";
import { biblioteca } from "./categories/biblioteca";
import { cama } from "./categories/cama";
import { escritorio } from "./categories/escritorio";
import { mesa } from "./categories/mesa";
import { rack } from "./categories/rack";
import { ratona } from "./categories/ratona";
import { recibidor } from "./categories/recibidor";
import { vajillero } from "./categories/vajillero";
import type { CategoryDefinition, CategoryId } from "./types";

/** Orden de presentación de las categorías. Para sumar una nueva, crear su módulo y agregarla acá. */
export const CATEGORIES: CategoryDefinition[] = [mesa, cama, rack, escritorio, biblioteca, ratona, barra, vajillero, recibidor];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));
const bySlug = new Map(CATEGORIES.map((c) => [c.slug, c]));

export const CATEGORY_IDS = CATEGORIES.map((c) => c.id) as [CategoryId, ...CategoryId[]];

export function getCategory(id: string): CategoryDefinition | undefined {
  return byId.get(id as CategoryId);
}

export function getCategoryBySlug(slug: string): CategoryDefinition | undefined {
  return bySlug.get(slug);
}

export function isCategoryId(id: string): id is CategoryId {
  return byId.has(id as CategoryId);
}

export type * from "./types";
