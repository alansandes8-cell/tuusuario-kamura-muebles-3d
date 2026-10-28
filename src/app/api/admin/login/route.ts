import { NextResponse } from "next/server";
import { login, SESSION_COOKIE, sessionCookieOptions } from "@/lib/server/auth";
import { clientIp, isSameOrigin } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const r = await login(String(body?.password ?? ""), clientIp(req.headers));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, r.token, sessionCookieOptions(r.maxAge));
  return res;
}
