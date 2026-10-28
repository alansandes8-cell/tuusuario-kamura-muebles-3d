import { NextResponse } from "next/server";
import { aiConfigured } from "@/lib/server/ai";
import { getDb } from "@/lib/server/db";
import { emailConfigured } from "@/lib/server/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Estado de los servicios (sin datos sensibles). */
export async function GET() {
  let database = "ok";
  try {
    const db = await getDb();
    await db.query("select 1");
  } catch {
    database = "error";
  }
  return NextResponse.json(
    { database, ai: aiConfigured() ? "configurado" : "no configurado", email: emailConfigured() ? "configurado" : "no configurado" },
    { status: database === "ok" ? 200 : 503 },
  );
}
