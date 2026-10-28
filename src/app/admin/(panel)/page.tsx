import type { Metadata } from "next";
import Link from "next/link";
import { FrontElevation } from "@/components/viewer/FrontElevation";
import { ESTADOS, estadoLabel } from "@/config/estados";
import { CATEGORIES, getCategory } from "@/lib/catalog";
import { parseDesign } from "@/lib/design/design";
import { listQuotes, PAGE_SIZE } from "@/lib/server/quotes";
import { woodOrDefault } from "@/lib/woods";

export const metadata: Metadata = { title: "Solicitudes" };

const fmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filters = { q: sp.q, status: sp.estado, category: sp.categoria, from: sp.desde, to: sp.hasta, page: Number(sp.pagina ?? 1) || 1 };
  const { items, total } = await listQuotes(filters);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = (patch: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: sp.q, estado: sp.estado, categoria: sp.categoria, desde: sp.desde, hasta: sp.hasta, pagina: sp.pagina, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== "") p.set(k, String(v));
    return p.toString();
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", margin: 0 }}>Solicitudes de cotización</h1>
          <p className="muted" style={{ margin: 0 }}>
            {total} {total === 1 ? "solicitud" : "solicitudes"}
          </p>
        </div>
        <a className="btn btn-outline btn-sm" href={`/api/admin/export?${qs({ pagina: undefined })}`}>
          Exportar CSV
        </a>
      </div>
      <form className="filters" method="get" role="search">
        <div className="field">
          <label htmlFor="q">Buscar</label>
          <input id="q" name="q" className="input" defaultValue={sp.q} placeholder="Nombre, correo, teléfono o código" />
        </div>
        <div className="field">
          <label htmlFor="estado">Estado</label>
          <select id="estado" name="estado" className="select" defaultValue={sp.estado ?? ""}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="categoria">Mueble</label>
          <select id="categoria" name="categoria" className="select" defaultValue={sp.categoria ?? ""}>
            <option value="">Todos</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="desde">Desde</label>
          <input id="desde" name="desde" type="date" className="input" defaultValue={sp.desde} />
        </div>
        <div className="field">
          <label htmlFor="hasta">Hasta</label>
          <input id="hasta" name="hasta" type="date" className="input" defaultValue={sp.hasta} />
        </div>
        <button className="btn btn-primary">Filtrar</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="thumb-cell">Diseño</th>
              <th>Código</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Contacto</th>
              <th>Mueble</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 40 }} className="muted">
                  No hay solicitudes con estos filtros.
                </td>
              </tr>
            )}
            {items.map((q) => {
              const pd = parseDesign(q.design);
              const notif = q.notifications ?? {};
              return (
                <tr key={q.id}>
                  <td className="thumb-cell">
                    <div className="mini">{pd.ok && <FrontElevation design={pd.design} />}</div>
                  </td>
                  <td>
                    <Link href={`/admin/solicitudes/${q.id}`}>{q.public_code}</Link>
                    {notif.admin === "failed" && (
                      <div className="small" style={{ color: "var(--danger)" }}>
                        Falló el aviso por correo
                      </div>
                    )}
                  </td>
                  <td>{fmt.format(new Date(q.created_at))}</td>
                  <td>
                    {q.customer_name}
                    <div className="small muted">{[q.city, q.province].filter(Boolean).join(", ")}</div>
                  </td>
                  <td>
                    <div>{q.phone}</div>
                    <div className="small muted">{q.email}</div>
                  </td>
                  <td>
                    <span>{getCategory(q.category)?.singular ?? q.category}</span>
                    <div className="small muted">{woodOrDefault(q.wood).name}</div>
                  </td>
                  <td>
                    <span className={`status status-${q.status}`}>{estadoLabel(q.status)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <span className="muted">
          Página {Math.min(filters.page, pages)} de {pages}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          {filters.page > 1 && (
            <Link className="btn btn-outline btn-sm" href={`/admin?${qs({ pagina: filters.page - 1 })}`}>
              Anterior
            </Link>
          )}
          {filters.page < pages && (
            <Link className="btn btn-outline btn-sm" href={`/admin?${qs({ pagina: filters.page + 1 })}`}>
              Siguiente
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
