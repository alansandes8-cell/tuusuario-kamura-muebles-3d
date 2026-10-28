import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/server/adminRoute";
import { addQuoteNote } from "@/lib/server/quotes";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin(req, true);
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { body?: string } | null;
  const ok = await addQuoteNote(id, String(body?.body ?? ""));
  return ok ? NextResponse.json({ ok: true }, { status: 201 }) : NextResponse.json({ error: "No se pudo guardar la nota." }, { status: 400 });
}
