import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/server/adminRoute";
import { updateQuoteStatus } from "@/lib/server/quotes";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin(req, true);
  if (denied) return denied;
  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { status?: string } | null;
  const ok = await updateQuoteStatus(id, String(body?.status ?? ""));
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "No se pudo actualizar el estado." }, { status: 400 });
}
