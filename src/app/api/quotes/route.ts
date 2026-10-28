import { NextResponse } from "next/server";
import { submitQuote, type IncomingFile } from "@/lib/server/quotes";
import { clientIp, isSameOrigin } from "@/lib/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY = 5.5 * 1024 * 1024;

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return NextResponse.json({ error: "La solicitud es demasiado pesada. Probá con fotos más livianas." }, { status: 413 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "No pudimos leer la solicitud." }, { status: 400 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(String(form.get("payload") ?? ""));
  } catch {
    return NextResponse.json({ error: "No pudimos leer la solicitud." }, { status: 400 });
  }
  const files: IncomingFile[] = [];
  for (const [field, value] of form.entries()) {
    if (field === "payload") continue;
    if (typeof value === "string") return NextResponse.json({ error: "Campo inesperado." }, { status: 400 });
    if (files.length >= 6) return NextResponse.json({ error: "Demasiados archivos." }, { status: 400 });
    files.push({ field, name: value.name, bytes: new Uint8Array(await value.arrayBuffer()) });
  }
  try {
    const result = await submitQuote(payload, files, { ip: clientIp(req.headers) });
    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    console.error("[kamura] Error inesperado en /api/quotes", e);
    return NextResponse.json({ error: "No pudimos guardar tu solicitud. Tu diseño sigue a salvo: intentá de nuevo en unos minutos." }, { status: 500 });
  }
}
