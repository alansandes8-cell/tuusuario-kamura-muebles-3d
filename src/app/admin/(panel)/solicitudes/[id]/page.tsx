import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminDesignViewer } from "@/components/admin/AdminDesignViewer";
import { NoteForm, StatusSelect } from "@/components/admin/AdminControls";
import { SummaryList } from "@/components/configurator/SummaryPanel";
import { parseDesign } from "@/lib/design/design";
import { getQuote } from "@/lib/server/quotes";

export const metadata = { title: "Solicitud" };

const fmt = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" });

const EVENT_LABELS: Record<string, string> = {
  creada: "Solicitud recibida",
  estado: "Cambio de estado",
  notificacion_enviada: "Correo enviado",
  notificacion_fallida: "Falló el envío de correo",
  notificacion_omitida: "Correo no enviado",
};

function eventDetail(type: string, d: Record<string, unknown>): string {
  if (type === "estado") return `${d.de} → ${d.a}`;
  if (type.startsWith("notificacion")) return [d.destinatario, d.error ?? d.motivo].filter(Boolean).join(": ");
  return "";
}

export default async function QuoteDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getQuote(id);
  if (!data) notFound();
  const q = data.quote as Record<string, string | null> & { design: unknown; review_warnings: { message: string }[]; change_log: { at: string; source: string; summary: string }[]; source: Record<string, string> };
  const pd = parseDesign(q.design);
  const renders = data.files.filter((f) => f.kind.startsWith("render"));
  const attachments = data.files.filter((f) => f.kind === "adjunto");
  const whatsapp = String(q.phone ?? "").replace(/\D/g, "");

  return (
    <>
      <p className="small">
        <Link href="/admin">← Todas las solicitudes</Link>
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "end", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: "1.8rem", margin: 0 }}>{q.public_code}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Recibida el {fmt.format(new Date(String(q.created_at)))}
          </p>
        </div>
        <a className="btn btn-outline btn-sm" href={`/api/admin/quotes/${id}/export`}>
          Descargar datos (JSON)
        </a>
      </div>

      <div className="detail-grid">
        <div>
          {pd.ok ? <AdminDesignViewer design={pd.design} code={String(q.public_code)} /> : <p className="notice notice-error">El diseño guardado no se pudo interpretar.</p>}

          {q.review_warnings?.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <h2 style={{ fontSize: "1.1rem" }}>Requiere revisión</h2>
              {q.review_warnings.map((w) => (
                <p key={w.message} className="notice notice-warn">
                  {w.message}
                </p>
              ))}
            </div>
          )}

          <div className="card" style={{ marginTop: 16 }}>
            <h2 style={{ fontSize: "1.1rem" }}>Configuración</h2>
            {pd.ok && <SummaryList design={pd.design} />}
          </div>

          {(renders.length > 0 || attachments.length > 0) && (
            <div className="card">
              <h2 style={{ fontSize: "1.1rem" }}>Imágenes</h2>
              {renders.length > 0 && (
                <>
                  <p className="small muted">Capturas del modelo 3D enviadas con la solicitud.</p>
                  <div className="renders">
                    {renders.map((f) => (
                      <a key={f.id} href={`/api/admin/files/${f.id}?descargar=1`} title="Descargar">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/admin/files/${f.id}`} alt={f.kind.replace("render_", "Vista ")} />
                      </a>
                    ))}
                  </div>
                </>
              )}
              {attachments.length > 0 && (
                <>
                  <p className="small muted" style={{ marginTop: 14 }}>
                    Fotos del cliente.
                  </p>
                  <div className="renders">
                    {attachments.map((f) => (
                      <a key={f.id} href={`/api/admin/files/${f.id}`} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/api/admin/files/${f.id}`} alt={f.filename} />
                      </a>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {q.change_log?.length > 0 && (
            <div className="card">
              <h2 style={{ fontSize: "1.1rem" }}>Historial de cambios del cliente</h2>
              <ul className="timeline">
                {q.change_log.map((c, i) => (
                  <li key={i}>
                    <span>
                      {c.summary} {c.source === "asistente" && <span className="small muted">(con el asistente)</span>}
                    </span>
                    <time>{fmt.format(new Date(c.at))}</time>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div>
          <div className="card">
            <StatusSelect id={id} status={String(q.status)} />
          </div>
          <div className="card">
            <h2 style={{ fontSize: "1.1rem" }}>Cliente</h2>
            <dl className="summary-list">
              <dt>Nombre</dt>
              <dd>{q.customer_name}</dd>
              <dt>Teléfono</dt>
              <dd>
                {q.phone}
                {whatsapp && (
                  <>
                    {" · "}
                    <a href={`https://wa.me/${whatsapp.startsWith("54") ? whatsapp : `54${whatsapp}`}`} target="_blank" rel="noreferrer">
                      WhatsApp
                    </a>
                  </>
                )}
              </dd>
              <dt>Correo</dt>
              <dd>
                <a href={`mailto:${q.email}?subject=${encodeURIComponent(`Tu diseño ${q.public_code}`)}`}>{q.email}</a>
              </dd>
              {(q.city || q.province) && (
                <>
                  <dt>Ubicación</dt>
                  <dd>{[q.city, q.province].filter(Boolean).join(", ")}</dd>
                </>
              )}
            </dl>
            {q.comments && (
              <>
                <h3 className="group-title">Comentarios</h3>
                <p className="small" style={{ whiteSpace: "pre-wrap" }}>
                  {q.comments}
                </p>
              </>
            )}
            {q.source && Object.keys(q.source).length > 0 && (
              <>
                <h3 className="group-title">Origen de la visita</h3>
                <p className="small muted">
                  {Object.entries(q.source)
                    .filter(([, v]) => v)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ")}
                </p>
              </>
            )}
          </div>
          <div className="card">
            <h2 style={{ fontSize: "1.1rem" }}>Notas internas</h2>
            <NoteForm id={id} />
            <ul className="timeline" style={{ marginTop: 16 }}>
              {data.notes.map((n) => (
                <li key={n.id}>
                  <span style={{ whiteSpace: "pre-wrap" }}>{n.body}</span>
                  <time>{fmt.format(new Date(n.created_at))}</time>
                </li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h2 style={{ fontSize: "1.1rem" }}>Actividad</h2>
            <ul className="timeline">
              {data.events.map((e) => (
                <li key={e.id}>
                  <span>
                    <strong>{EVENT_LABELS[e.type] ?? e.type}</strong> {eventDetail(e.type, e.detail)}
                  </span>
                  <time>{fmt.format(new Date(e.created_at))}</time>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
