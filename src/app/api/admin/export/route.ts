import { NextResponse } from "next/server";
import { estadoLabel } from "@/config/estados";
import { getCategory } from "@/lib/catalog";
import { guardAdmin } from "@/lib/server/adminRoute";
import { listQuotes } from "@/lib/server/quotes";
import { woodOrDefault } from "@/lib/woods";

export const runtime = "nodejs";

const csv = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

/** Exporta en CSV las solicitudes que coinciden con los filtros. */
export async function GET(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const sp = new URL(req.url).searchParams;
  const { items } = await listQuotes(
    { q: sp.get("q") ?? undefined, status: sp.get("estado") ?? undefined, category: sp.get("categoria") ?? undefined, from: sp.get("desde") ?? undefined, to: sp.get("hasta") ?? undefined },
    5000,
  );
  const header = ["Código", "Fecha", "Estado", "Nombre", "Teléfono", "Correo", "Localidad", "Provincia", "Mueble", "Madera"];
  const rows = items.map((q) =>
    [q.public_code, new Date(q.created_at).toISOString(), estadoLabel(q.status), q.customer_name, q.phone, q.email, q.city, q.province, getCategory(q.category)?.singular ?? q.category, woodOrDefault(q.wood).name]
      .map(csv)
      .join(","),
  );
  return new NextResponse("﻿" + [header.map(csv).join(","), ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="solicitudes-kamura.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
