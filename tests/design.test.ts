import { describe, expect, it } from "vitest";
import { getCategory } from "@/lib/catalog";
import { boundingBox } from "@/lib/catalog/parts";
import { applyAction } from "@/lib/design/actions";
import { createDesign, DESIGN_SCHEMA_VERSION, parseDesign, type Design } from "@/lib/design/design";
import { summarizeDesign, summaryText } from "@/lib/design/summary";
import { validateDesign } from "@/lib/design/validation";
import { WOODS } from "@/lib/woods";

const ok = (d: Design, a: Parameters<typeof applyAction>[1]) => {
  const r = applyAction(d, a);
  if (!r.ok) throw new Error(r.error);
  return r.design;
};

describe("actualización de medidas", () => {
  it("cambia la medida y la geometría se escala en proporción", () => {
    const d = createDesign("mesa");
    const next = ok(d, { type: "setDimension", key: "largo", value: 220 });
    expect(next.dimensions.largo).toBe(220);
    const bb = boundingBox(getCategory("mesa")!.build(next));
    expect(bb.size[0]).toBeCloseTo(220, 1);
    expect(bb.size[1]).toBeCloseTo(next.dimensions.alto, 1);
    expect(bb.size[2]).toBeCloseTo(next.dimensions.ancho, 1);
  });

  it("rechaza valores fuera de rango con un mensaje claro y no modifica el diseño", () => {
    const d = createDesign("mesa");
    const r = applyAction(d, { type: "setDimension", key: "largo", value: 999 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/entre 80 cm y 320 cm/);
    expect(d.dimensions.largo).toBe(180);
  });

  it("rechaza medidas inexistentes o no visibles", () => {
    expect(applyAction(createDesign("mesa"), { type: "setDimension", key: "diametro", value: 80 }).ok).toBe(false);
    // Una ratona rectangular no usa diámetro.
    const ratona = createDesign("ratona", "con-estante");
    expect(applyAction(ratona, { type: "setDimension", key: "diametro", value: 80 }).ok).toBe(false);
  });

  it("restaura las medidas sugeridas del estilo", () => {
    const d = ok(createDesign("mesa", "caballete"), { type: "setDimension", key: "largo", value: 150 });
    const r = ok(d, { type: "resetDimensions" });
    expect(r.dimensions.largo).toBe(200);
  });

  it("advierte medidas que requieren revisión sin bloquear", () => {
    const d = ok(createDesign("mesa"), { type: "setDimension", key: "largo", value: 280 });
    const v = validateDesign(d);
    expect(v.errors).toEqual([]);
    expect(v.warnings.length).toBeGreaterThan(0);
  });

  it("el colchón de referencia no cuenta en las medidas exteriores", () => {
    const d = createDesign("cama");
    const withMattress = summarizeDesign(d).overall;
    const without = summarizeDesign(ok(d, { type: "setOption", key: "mostrarColchon", value: false })).overall;
    expect(withMattress).toEqual(without);
  });
});

describe("cambio de madera", () => {
  it("acepta las seis maderas por id y por nombre", () => {
    expect(WOODS.map((w) => w.name)).toEqual(["Petiribí", "Lapacho", "Incienso", "Guayubira", "Guatambú", "Paraíso"]);
    let d = createDesign("rack");
    for (const w of WOODS) {
      d = ok(d, { type: "setWood", wood: w.id });
      expect(d.wood).toBe(w.id);
    }
    expect(ok(d, { type: "setWood", wood: "Paraíso" }).wood).toBe("paraiso");
  });

  it("rechaza maderas no ofrecidas", () => {
    expect(applyAction(createDesign("rack"), { type: "setWood", wood: "roble" }).ok).toBe(false);
  });

  it("al cambiar de estilo se conserva la madera", () => {
    const d = ok(createDesign("biblioteca"), { type: "setWood", wood: "guayubira" });
    expect(ok(d, { type: "applyTemplate", templateId: "asimetrica" }).wood).toBe("guayubira");
  });
});

describe("modificación de componentes", () => {
  it("más estantes generan más piezas", () => {
    const cat = getCategory("biblioteca")!;
    const d = createDesign("biblioteca");
    const more = ok(d, { type: "setOption", key: "estantes", value: 6 });
    const count = (x: Design) => cat.build(x).filter((p) => p.id.startsWith("estante-")).length;
    expect(count(more)).toBeGreaterThan(count(d));
  });

  it("la cantidad de cajones se refleja en el modelo", () => {
    const cat = getCategory("escritorio")!;
    const d = ok(createDesign("escritorio", "con-cajonera"), { type: "setOption", key: "cajones", value: 2 });
    expect(cat.build(d).filter((p) => /^cajon-\d+$/.test(p.id))).toHaveLength(2);
  });

  it("acepta opciones por etiqueta y valida valores", () => {
    const d = ok(createDesign("mesa"), { type: "setOption", key: "patas", value: "Caballete" });
    expect(d.options.patas).toBe("caballete");
    expect(applyAction(d, { type: "setOption", key: "patas", value: "metal" }).ok).toBe(false);
    expect(applyAction(d, { type: "setOption", key: "faldon", value: true }).ok).toBe(false); // no visible con caballete
  });

  it("impide combinaciones incompatibles", () => {
    const d = ok(createDesign("escritorio"), { type: "setDimension", key: "ancho", value: 80 });
    const r = applyAction(d, { type: "setOption", key: "cajonera", value: "derecha" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/100 cm/);
  });

  it("cambiar de mueble crea un diseño de esa categoría", () => {
    const d = ok(createDesign("mesa"), { type: "setCategory", category: "rack", templateId: "colgante" });
    expect(d.category).toBe("rack");
    expect(d.templateId).toBe("colgante");
  });
});

describe("serialización y recuperación", () => {
  it("un diseño sobrevive a JSON ida y vuelta sin cambios", () => {
    let d = createDesign("vajillero", "vitrina", "paraiso");
    d = ok(d, { type: "setDimension", key: "ancho", value: 175 });
    d = ok(d, { type: "setDetails", patch: { notas: "Va en un comedor chico." } });
    const r = parseDesign(JSON.parse(JSON.stringify(d)));
    expect(r.ok && r.design).toEqual(d);
  });

  it("completa opciones nuevas con valores por defecto y descarta claves desconocidas", () => {
    const d = createDesign("rack") as unknown as Record<string, unknown>;
    const raw = { ...d, options: { modulos: 4, inventada: "x" }, dimensions: { ancho: 200, otra: 3 } };
    const r = parseDesign(raw);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.design.options.modulos).toBe(4);
      expect(r.design.options.distribucion).toBeDefined();
      expect("inventada" in r.design.options).toBe(false);
      expect(r.design.dimensions.ancho).toBe(200);
      expect("otra" in r.design.dimensions).toBe(false);
    }
  });

  it("rechaza datos inválidos o de una versión futura", () => {
    expect(parseDesign({ foo: 1 }).ok).toBe(false);
    expect(parseDesign({ ...createDesign("mesa"), category: "silla" }).ok).toBe(false);
    expect(parseDesign({ ...createDesign("mesa"), schemaVersion: DESIGN_SCHEMA_VERSION + 1 }).ok).toBe(false);
  });

  it("el resumen legible incluye mueble, madera y medidas", () => {
    const txt = summaryText(createDesign("mesa", undefined, "lapacho"));
    expect(txt).toContain("Madera: Lapacho");
    expect(txt).toContain("Largo: 180 cm");
    expect(txt).not.toMatch(/\$|precio/i);
  });
});
