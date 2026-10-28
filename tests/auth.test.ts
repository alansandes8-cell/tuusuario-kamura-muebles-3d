import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const cookieStore = new Map<string, string>();
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (k: string) => (cookieStore.has(k) ? { value: cookieStore.get(k) } : undefined) }),
}));

import { isAdmin, login, logout, SESSION_COOKIE, validateSession } from "@/lib/server/auth";
import { resetDbForTests } from "@/lib/server/db";
import { hashPassword, verifyPassword } from "@/lib/server/security";
import { GET as exportGet } from "@/app/api/admin/export/route";
import { GET as fileGet } from "@/app/api/admin/files/[id]/route";
import { PATCH as statusPatch } from "@/app/api/admin/quotes/[id]/route";

beforeAll(async () => {
  vi.stubEnv("PGLITE_DIR", "memory://");
  vi.stubEnv("DATABASE_URL", "");
  vi.stubEnv("ADMIN_PASSWORD_HASH", await hashPassword("una-clave-de-prueba"));
  await resetDbForTests();
});
afterAll(async () => {
  await resetDbForTests();
  vi.unstubAllEnvs();
});

describe("control de acceso administrativo", () => {
  it("verifica contraseñas con scrypt", async () => {
    const h = await hashPassword("secreto-largo-123");
    expect(await verifyPassword("secreto-largo-123", h)).toBe(true);
    expect(await verifyPassword("otro", h)).toBe(false);
    expect(await verifyPassword("x", "basura")).toBe(false);
  });

  it("las rutas del panel rechazan pedidos sin sesión", async () => {
    cookieStore.clear();
    const id = "00000000-0000-0000-0000-000000000000";
    expect((await exportGet(new Request("http://x/api/admin/export"))).status).toBe(401);
    expect((await fileGet(new Request(`http://x/api/admin/files/${id}`), { params: Promise.resolve({ id }) })).status).toBe(401);
    const patch = new Request(`http://x/api/admin/quotes/${id}`, { method: "PATCH", headers: { origin: "http://x", host: "x" }, body: "{}" });
    expect((await statusPatch(patch, { params: Promise.resolve({ id }) })).status).toBe(401);
  });

  it("rechaza escrituras desde otro origen aunque haya sesión", async () => {
    const r = await login("una-clave-de-prueba", "1.1.1.1");
    if (!r.ok) throw new Error(r.error);
    cookieStore.set(SESSION_COOKIE, r.token);
    const id = "00000000-0000-0000-0000-000000000000";
    const patch = new Request(`http://x/api/admin/quotes/${id}`, { method: "PATCH", headers: { origin: "https://malicioso.com", host: "x" }, body: "{}" });
    expect((await statusPatch(patch, { params: Promise.resolve({ id }) })).status).toBe(403);
  });

  it("una sesión válida da acceso y al salir se revoca", async () => {
    const r = await login("una-clave-de-prueba", "2.2.2.2");
    if (!r.ok) throw new Error(r.error);
    cookieStore.set(SESSION_COOKIE, r.token);
    expect(await isAdmin()).toBe(true);
    expect((await exportGet(new Request("http://x/api/admin/export"))).status).toBe(200);
    await logout(r.token);
    expect(await validateSession(r.token)).toBe(false);
    expect(await isAdmin()).toBe(false);
  });

  it("contraseña incorrecta y bloqueo por intentos", async () => {
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await login("mala", "3.3.3.3"));
    expect(results[0]).toMatchObject({ ok: false, status: 401 });
    expect(results[5]).toMatchObject({ ok: false, status: 429 });
  });

  it("un token inventado no da acceso", async () => {
    expect(await validateSession("inventado")).toBe(false);
    expect(await validateSession(undefined)).toBe(false);
  });
});
