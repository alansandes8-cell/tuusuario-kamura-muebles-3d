import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createDesign } from "@/lib/design/design";
import { getDb, resetDbForTests } from "@/lib/server/db";
import { addQuoteNote, getQuote, listQuotes, loadSharedDesign, saveSharedDesign, submitQuote, updateQuoteStatus } from "@/lib/server/quotes";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46]);

function payload(over: Record<string, unknown> = {}) {
  return {
    design: createDesign("mesa", "clasica", "lapacho"),
    contact: { name: "Ana Pérez", phone: "+54 11 2345-6789", email: "ana@example.com", city: "Rosario", province: "Santa Fe", comments: "Para 8 personas" },
    changeLog: [{ at: new Date().toISOString(), source: "usuario", category: "mesa", summary: "Madera: Lapacho" }],
    source: { utm_source: "instagram" },
    idempotencyKey: randomUUID(),
    startedAt: Date.now() - 60_000,
    website: "",
    ...over,
  };
}

let ipN = 0;
const ctx = () => ({ ip: `10.0.0.${++ipN}` });

beforeAll(async () => {
  vi.stubEnv("PGLITE_DIR", "memory://");
  vi.stubEnv("DATABASE_URL", "");
  await resetDbForTests();
});
afterAll(async () => {
  await resetDbForTests();
  vi.unstubAllEnvs();
});

describe("envío de solicitudes", () => {
  it("guarda la solicitud con datos estructurados, imágenes y enlace privado", async () => {
    const r = await submitQuote(payload(), [{ field: "render_perspectiva", name: "p.jpg", bytes: JPEG }], ctx());
    expect(r.status).toBe(201);
    if (r.status !== 201) return;
    expect(r.body.code).toMatch(/^KAM-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
    // Sin correo configurado, se registra como omitido y la solicitud queda guardada.
    expect(r.body.customerEmail).toBe("skipped");

    const { items } = await listQuotes({ q: r.body.code });
    expect(items).toHaveLength(1);
    const full = await getQuote(items[0].id);
    expect(full!.quote.status).toBe("nueva");
    expect((full!.quote.design as { wood: string }).wood).toBe("lapacho");
    expect(String(full!.quote.summary)).toContain("Largo: 180 cm");
    expect(full!.files).toHaveLength(1);
    expect(full!.events.map((e) => e.type)).toContain("creada");
    expect(full!.events.map((e) => e.type)).toContain("notificacion_omitida");

    const shared = await loadSharedDesign(r.body.token);
    expect(shared?.design.category).toBe("mesa");
    expect(shared?.fromQuote).toBe(true);
  });

  it("no duplica la solicitud si se reintenta con la misma clave", async () => {
    const p = payload();
    const a = await submitQuote(p, [], ctx());
    const b = await submitQuote(p, [], ctx());
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    if (a.status === 201 && b.status === 200) {
      expect(b.body.code).toBe(a.body.code);
      expect(b.body.token).toBe(a.body.token);
    }
    const db = await getDb();
    const rows = await db.query("select 1 from kamura.quote_requests where idempotency_key = $1", [p.idempotencyKey]);
    expect(rows).toHaveLength(1);
  });

  it("valida los datos de contacto", async () => {
    const r = await submitQuote(payload({ contact: { name: "A", phone: "12", email: "no-es-mail" } }), [], ctx());
    expect(r.status).toBe(400);
    if (r.status === 400) {
      expect(Object.keys(r.body.fieldErrors ?? {}).sort()).toEqual(["email", "name", "phone"]);
    }
  });

  it("rechaza robots: campo trampa y envío demasiado rápido", async () => {
    expect((await submitQuote(payload({ website: "http://spam" }), [], ctx())).status).toBe(400);
    expect((await submitQuote(payload({ startedAt: Date.now() }), [], ctx())).status).toBe(400);
  });

  it("rechaza diseños con errores", async () => {
    const d = createDesign("mesa");
    d.dimensions.largo = 5000;
    const r = await submitQuote(payload({ design: d }), [], ctx());
    expect(r.status).toBe(422);
  });

  it("rechaza archivos que no son imágenes", async () => {
    const r = await submitQuote(payload(), [{ field: "adjunto", name: "x.jpg", bytes: new TextEncoder().encode("<script>") }], ctx());
    expect(r.status).toBe(400);
  });

  it("limita la cantidad de envíos por conexión", async () => {
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await submitQuote(payload(), [], { ip: "192.168.9.9" })).status);
    expect(statuses.slice(0, 5).every((s) => s === 201)).toBe(true);
    expect(statuses[5]).toBe(429);
  });

  it("permite cambiar el estado y agregar notas internas", async () => {
    const r = await submitQuote(payload(), [], ctx());
    if (r.status !== 201) throw new Error("no creada");
    const [item] = (await listQuotes({ q: r.body.code })).items;
    expect(await updateQuoteStatus(item.id, "en_revision")).toBe(true);
    expect(await updateQuoteStatus(item.id, "inventado")).toBe(false);
    expect(await addQuoteNote(item.id, "Llamar el lunes")).toBe(true);
    const full = await getQuote(item.id);
    expect(full!.quote.status).toBe("en_revision");
    expect(full!.notes[0].body).toBe("Llamar el lunes");
    expect((await listQuotes({ status: "en_revision" })).items.some((q) => q.id === item.id)).toBe(true);
    expect((await listQuotes({ q: "2345" })).total).toBeGreaterThan(0);
  });
});

describe("enlaces privados de diseño", () => {
  it("guarda y recupera un diseño con un token no predecible", async () => {
    const d = createDesign("biblioteca", "asimetrica", "incienso");
    const r = await saveSharedDesign(d, "iphash");
    expect("token" in r).toBe(true);
    if ("token" in r) {
      expect(r.token.length).toBeGreaterThanOrEqual(30);
      expect((await loadSharedDesign(r.token))?.design).toEqual(d);
      expect(await loadSharedDesign(r.token.slice(0, -2) + "zz")).toBeNull();
    }
    expect(await loadSharedDesign("../../etc")).toBeNull();
  });
});
