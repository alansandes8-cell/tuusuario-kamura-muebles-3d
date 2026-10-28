import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/lib/catalog";
import { boundingBox } from "@/lib/catalog/parts";
import { createDesign } from "@/lib/design/design";
import { validateDesign } from "@/lib/design/validation";

describe("catálogo", () => {
  it("tiene las nueve categorías con slugs únicos", () => {
    expect(CATEGORIES).toHaveLength(9);
    expect(new Set(CATEGORIES.map((c) => c.slug)).size).toBe(9);
  });

  for (const cat of CATEGORIES) {
    describe(cat.name, () => {
      it("tiene entre 2 y 3 plantillas y la predeterminada existe", () => {
        expect(cat.templates.length).toBeGreaterThanOrEqual(2);
        expect(cat.templates.length).toBeLessThanOrEqual(3);
        expect(cat.templates.some((t) => t.id === cat.defaultTemplateId)).toBe(true);
      });

      for (const t of cat.templates) {
        it(`plantilla "${t.name}" es válida y genera geometría finita`, () => {
          const d = createDesign(cat.id, t.id);
          expect(validateDesign(d).errors).toEqual([]);
          const parts = cat.build(d);
          expect(parts.length).toBeGreaterThan(0);
          const ids = new Set<string>();
          for (const p of parts) {
            expect(ids.has(p.id), `id duplicado ${p.id}`).toBe(false);
            ids.add(p.id);
            for (const n of p.position) expect(Number.isFinite(n)).toBe(true);
            if (p.kind === "box") for (const n of p.size) expect(n, `${p.id} size`).toBeGreaterThan(0);
            else expect(p.height).toBeGreaterThan(0);
          }
          const bb = boundingBox(parts);
          expect(bb.min[1]).toBeGreaterThanOrEqual(-0.01);
        });
      }

      it("las opciones y medidas predeterminadas están dentro de los rangos", () => {
        for (const dspec of cat.dimensions) {
          expect(dspec.default).toBeGreaterThanOrEqual(dspec.min);
          expect(dspec.default).toBeLessThanOrEqual(dspec.max);
        }
        for (const t of cat.templates) {
          for (const [k, v] of Object.entries(t.dimensions ?? {})) {
            const s = cat.dimensions.find((x) => x.key === k)!;
            expect(s, k).toBeDefined();
            expect(v).toBeGreaterThanOrEqual(s.min);
            expect(v).toBeLessThanOrEqual(s.max);
          }
          for (const k of Object.keys(t.options ?? {})) {
            expect(cat.options.some((o) => o.key === k), `${t.id}.${k}`).toBe(true);
          }
        }
      });
    });
  }
});
