/**
 * Autenticación del panel administrativo.
 *
 * Una contraseña de administración (guardada solo como hash scrypt en
 * ADMIN_PASSWORD_HASH) y sesiones con token aleatorio guardado como hash en la
 * base de datos. La cookie es httpOnly, SameSite=Strict y Secure en producción.
 */
import { cookies } from "next/headers";
import { getDb } from "./db";
import { hashIp, newToken, sha256, verifyPassword } from "./security";
import { rateLimit } from "./rateLimit";

export const SESSION_COOKIE = "kamura_admin";
const SESSION_HOURS = 12;

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD_HASH);
}

export type LoginResult = { ok: true; token: string; maxAge: number } | { ok: false; error: string; status: number };

export async function login(password: string, ip: string): Promise<LoginResult> {
  if (!adminConfigured()) return { ok: false, status: 503, error: "El acceso administrativo no está configurado (ADMIN_PASSWORD_HASH)." };
  const ipHash = hashIp(ip);
  const allowed = (await rateLimit(`login:${ipHash}`, 5, 900)) && (await rateLimit("login:global", 50, 3600));
  if (!allowed) return { ok: false, status: 429, error: "Demasiados intentos. Esperá 15 minutos." };
  if (typeof password !== "string" || password.length > 200 || !(await verifyPassword(password, process.env.ADMIN_PASSWORD_HASH!))) {
    return { ok: false, status: 401, error: "Contraseña incorrecta." };
  }
  const token = newToken(32);
  const db = await getDb();
  await db.query("insert into kamura.admin_sessions (token_hash, expires_at, ip_hash) values ($1, now() + ($2 || ' hours')::interval, $3)", [
    sha256(token),
    String(SESSION_HOURS),
    ipHash,
  ]);
  await db.query("delete from kamura.admin_sessions where expires_at < now()");
  return { ok: true, token, maxAge: SESSION_HOURS * 3600 };
}

export async function validateSession(token: string | undefined): Promise<boolean> {
  if (!token || token.length > 100) return false;
  const db = await getDb();
  const rows = await db.query("select 1 from kamura.admin_sessions where token_hash = $1 and expires_at > now()", [sha256(token)]);
  return rows.length > 0;
}

export async function logout(token: string | undefined) {
  if (!token) return;
  const db = await getDb();
  await db.query("delete from kamura.admin_sessions where token_hash = $1", [sha256(token)]);
}

/** Para componentes de servidor y rutas: ¿la persona actual es administradora? */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return validateSession(store.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge,
  };
}
