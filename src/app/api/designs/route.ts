import { NextResponse } from "next/server";
import { saveSharedDesign } from "@/lib/server/quotes";
import { clientIp, hashIp, isSameOrigin } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { design?: unknown } | null;
  if (!body?.design) return NextResponse.json({ error: "Falta el diseño." }, { status: 400 });
  try {
    const r = await saveSharedDesign(body.design, hashIp(clientIp(req.headers)));
    if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ token: r.token }, { status: 201 });
  } catch (e) {
    console.error("[kamura] Error guardando diseño", e);
    return NextResponse.json({ error: "No pudimos guardar el diseño en este momento." }, { status: 500 });
  }
}
