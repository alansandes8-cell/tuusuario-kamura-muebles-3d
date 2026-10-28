import { NextResponse } from "next/server";
import { guardAdmin } from "@/lib/server/adminRoute";
import { getQuote } from "@/lib/server/quotes";

export const runtime = "nodejs";

/** Exporta la solicitud completa en JSON (sin los archivos binarios). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const { id } = await params;
  const data = await getQuote(id);
  if (!data) return NextResponse.json({ error: "No encontrada." }, { status: 404 });
  const q = data.quote;
  const exported = {
    formato: "kamura-solicitud",
    version: 1,
    codigo: q.public_code,
    fecha: q.created_at,
    estado: q.status,
    contacto: { nombre: q.customer_name, telefono: q.phone, email: q.email, localidad: q.city, provincia: q.province, comentarios: q.comments },
    resumen: q.summary,
    diseno: q.design,
    advertencias: q.review_warnings,
    historial_cambios: q.change_log,
    origen: q.source,
    archivos: data.files.map((f) => ({ tipo: f.kind, nombre: f.filename, mime: f.mime, bytes: f.size })),
    notas_internas: data.notes,
  };
  return new NextResponse(JSON.stringify(exported, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${String(q.public_code)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
