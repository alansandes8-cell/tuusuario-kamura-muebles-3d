/**
 * Solicitudes de cotización: validación, persistencia y notificaciones.
 */
import { createHmac } from "node:crypto";
import { z } from "zod";
import { RENDERS, UPLOADS } from "@/config/limites";
import { siteUrl } from "@/config/marca";
import { ESTADO_IDS, estadoLabel, type EstadoId } from "@/config/estados";
import { getCategory } from "@/lib/catalog";
import { parseDesign } from "@/lib/design/design";
import { summarizeDesign, summaryText } from "@/lib/design/summary";
import { validateDesign } from "@/lib/design/validation";
import { getDb, type QueryFn } from "./db";
import { escapeHtml, sendEmail, type EmailResult } from "./email";
import { hashIp, newId, newPublicCode, sha256, sniffImage } from "./security";
import { rateLimit } from "./rateLimit";
import { verifyTurnstile } from "./turnstile";
import { contactSchema } from "@/lib/quote/contact";

export { contactSchema };

export const SHARED_DESIGN_DAYS = 365;
/** Tiempo mínimo entre que se abre el formulario y se envía (anti-robots). */
export const MIN_FILL_MS = 3000;

const changeEntrySchema = z.object({
  at: z.string().max(40),
  source: z.enum(["usuario", "asistente"]),
  category: z.string().max(30),
  summary: z.string().max(200),
  field: z.string().max(80).optional(),
});

const sourceSchema = z
  .object({
    utm_source: z.string().max(100),
    utm_medium: z.string().max(100),
    utm_campaign: z.string().max(150),
    referrer: z.string().max(300),
    landing: z.string().max(300),
  })
  .partial();

export const quotePayloadSchema = z.object({
  design: z.unknown(),
  contact: contactSchema,
  changeLog: z.array(changeEntrySchema).max(80).default([]),
  source: sourceSchema.default({}),
  idempotencyKey: z.string().uuid(),
  startedAt: z.number().int().positive(),
  website: z.string().max(300).default(""),
  turnstileToken: z.string().max(4000).optional(),
});

export interface IncomingFile {
  field: string;
  name: string;
  bytes: Uint8Array;
}

export type SubmitResult =
  | { status: 200 | 201; body: { code: string; token: string; duplicate?: boolean; customerEmail?: "sent" | "skipped" | "failed" } }
  | { status: 400 | 409 | 422 | 429 | 500 | 503; body: { error: string; fieldErrors?: Record<string, string> } };

/** Token del enlace privado del diseño: derivado de la clave de envío, reproducible ante reintentos. */
function designTokenFor(idempotencyKey: string): string {
  const secret = process.env.APP_SECRET ?? "desarrollo-no-usar-en-produccion-0000000000";
  return createHmac("sha256", secret).update(`design:${idempotencyKey}`).digest("base64url").slice(0, 32);
}

export async function submitQuote(raw: unknown, files: IncomingFile[], ctx: { ip: string; now?: number }): Promise<SubmitResult> {
  const now = ctx.now ?? Date.now();
  const parsed = quotePayloadSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === "contact" && typeof issue.path[1] === "string") fieldErrors[issue.path[1]] ??= issue.message;
    }
    return { status: 400, body: { error: "Revisá los datos del formulario.", fieldErrors } };
  }
  const p = parsed.data;
  if (p.website.trim() !== "") return { status: 400, body: { error: "No pudimos procesar la solicitud." } };
  if (now - p.startedAt < MIN_FILL_MS) {
    return { status: 400, body: { error: "Esperá unos segundos y volvé a intentar." } };
  }
  const turnstile = await verifyTurnstile(p.turnstileToken, ctx.ip);
  if (!turnstile) return { status: 400, body: { error: "No pudimos verificar que no seas un robot. Intentá de nuevo." } };

  const db = await getDb();
  const token = designTokenFor(p.idempotencyKey);

  // Reintento de un envío que ya se guardó: se devuelve el mismo resultado.
  const existing = await db.query<{ public_code: string }>("select public_code from kamura.quote_requests where idempotency_key = $1", [
    p.idempotencyKey,
  ]);
  if (existing[0]) return { status: 200, body: { code: existing[0].public_code, token, duplicate: true } };

  const ipHash = hashIp(ctx.ip);
  if (!(await rateLimit(`quote:h:${ipHash}`, 5, 3600)) || !(await rateLimit(`quote:d:${ipHash}`, 15, 86400))) {
    return { status: 429, body: { error: "Recibimos varias solicitudes desde tu conexión. Esperá un rato y volvé a intentar." } };
  }

  const pd = parseDesign(p.design);
  if (!pd.ok) return { status: 422, body: { error: pd.error } };
  const design = pd.design;
  const validation = validateDesign(design);
  if (validation.errors.length) {
    return { status: 422, body: { error: `El diseño tiene datos para corregir: ${validation.errors.map((e) => e.message).join(" ")}` } };
  }

  const stored: { kind: string; mime: string; filename: string; bytes: Uint8Array }[] = [];
  let attachments = 0;
  for (const f of files) {
    const mime = sniffImage(f.bytes);
    if (!mime) return { status: 400, body: { error: `El archivo «${f.name}» no es una imagen válida.` } };
    if (f.field === "render_perspectiva" || f.field === "render_frente") {
      if (f.bytes.length > RENDERS.maxBytes) return { status: 400, body: { error: "La imagen del diseño es demasiado pesada." } };
      stored.push({ kind: f.field, mime, filename: `${f.field}.${mime.split("/")[1]}`, bytes: f.bytes });
    } else if (f.field === "adjunto") {
      attachments++;
      if (attachments > UPLOADS.maxFiles) return { status: 400, body: { error: `Podés adjuntar hasta ${UPLOADS.maxFiles} fotos.` } };
      if (f.bytes.length > UPLOADS.maxBytes) return { status: 400, body: { error: `La foto «${f.name}» es demasiado pesada.` } };
      stored.push({ kind: "adjunto", mime, filename: f.name.replace(/[^\w.\-áéíóúñÁÉÍÓÚÑ ]/g, "_").slice(0, 100) || "foto.jpg", bytes: f.bytes });
    } else {
      return { status: 400, body: { error: "Se recibió un archivo inesperado." } };
    }
  }

  const id = newId();
  const summary = summaryText(design);
  let code = "";
  try {
    code = await db.tx(async (q) => {
      let publicCode = newPublicCode();
      for (let attempt = 0; attempt < 3; attempt++) {
        const clash = await q("select 1 from kamura.quote_requests where public_code = $1", [publicCode]);
        if (clash.length === 0) break;
        publicCode = newPublicCode();
      }
      await q(
        `insert into kamura.quote_requests
          (id, public_code, status, customer_name, phone, email, city, province, comments, category, wood, design, design_version,
           summary, review_warnings, change_log, source, idempotency_key, design_token_hash, ip_hash)
         values ($1,$2,'nueva',$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14::jsonb,$15::jsonb,$16::jsonb,$17,$18,$19)`,
        [
          id,
          publicCode,
          p.contact.name,
          p.contact.phone,
          p.contact.email,
          p.contact.city || null,
          p.contact.province || null,
          p.contact.comments || null,
          design.category,
          design.wood,
          JSON.stringify(design),
          design.schemaVersion,
          summary,
          JSON.stringify(validation.warnings),
          JSON.stringify(p.changeLog),
          JSON.stringify(p.source),
          p.idempotencyKey,
          sha256(token),
          ipHash,
        ],
      );
      for (const f of stored) {
        await q(
          "insert into kamura.quote_files (id, quote_id, kind, mime, size, filename, data) values ($1,$2,$3,$4,$5,$6,$7)",
          [newId(), id, f.kind, f.mime, f.bytes.length, f.filename, Buffer.from(f.bytes)],
        );
      }
      await q(
        `insert into kamura.shared_designs (token_hash, design, quote_id, expires_at)
         values ($1, $2::jsonb, $3, now() + ($4 || ' days')::interval)
         on conflict (token_hash) do nothing`,
        [sha256(token), JSON.stringify(design), id, String(SHARED_DESIGN_DAYS)],
      );
      await addEvent(q, id, "creada", { origen: "configurador" });
      return publicCode;
    });
  } catch (e) {
    // Carrera entre dos envíos simultáneos con la misma clave.
    const again = await db.query<{ public_code: string }>("select public_code from kamura.quote_requests where idempotency_key = $1", [
      p.idempotencyKey,
    ]);
    if (again[0]) return { status: 200, body: { code: again[0].public_code, token, duplicate: true } };
    console.error("[kamura] Error guardando la solicitud", e);
    return { status: 500, body: { error: "No pudimos guardar tu solicitud. Tu diseño sigue a salvo: intentá de nuevo en unos minutos." } };
  }

  // La solicitud ya está guardada: las notificaciones nunca la deshacen.
  const sent = await notifyQuote(id).catch((e) => {
    console.error("[kamura] Error en notificaciones", e);
    return null;
  });
  return { status: 201, body: { code, token, customerEmail: sent?.customer.status ?? "failed" } };
}

export async function addEvent(q: QueryFn, quoteId: string, type: string, detail: Record<string, unknown> = {}) {
  await q("insert into kamura.quote_events (id, quote_id, type, detail) values ($1, $2, $3, $4::jsonb)", [
    newId(),
    quoteId,
    type,
    JSON.stringify(detail),
  ]);
}

interface QuoteRow {
  id: string;
  public_code: string;
  created_at: string | Date;
  customer_name: string;
  phone: string;
  email: string;
  city: string | null;
  province: string | null;
  comments: string | null;
  design: unknown;
  summary: string;
  design_token_hash: string | null;
}

function emailHtml(title: string, intro: string, blocks: { title: string; lines: string[] }[], footer: string) {
  const section = (b: { title: string; lines: string[] }) =>
    `<h3 style="font:600 13px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#847669;margin:20px 0 6px">${escapeHtml(b.title)}</h3>` +
    b.lines.map((l) => `<p style="margin:0 0 4px;font:15px/1.5 Arial,sans-serif;color:#2a221d">${escapeHtml(l)}</p>`).join("");
  return `<div style="background:#f7f3ed;padding:24px"><div style="max-width:560px;margin:0 auto;background:#fffdf9;border:1px solid #e3d9cb;border-radius:12px;padding:28px">
<p style="font:600 20px Georgia,serif;margin:0 0 4px;color:#2a221d">Kamura Muebles</p>
<h1 style="font:500 22px Georgia,serif;color:#2a221d;margin:12px 0">${escapeHtml(title)}</h1>
<p style="font:15px/1.6 Arial,sans-serif;color:#54483f">${intro}</p>${blocks.map(section).join("")}
<p style="font:13px/1.6 Arial,sans-serif;color:#847669;margin-top:24px">${footer}</p></div></div>`;
}

/** Envía las notificaciones de una solicitud ya guardada y registra el resultado. */
export async function notifyQuote(quoteId: string): Promise<{ admin: EmailResult; customer: EmailResult }> {
  const db = await getDb();
  const [quote] = await db.query<QuoteRow>("select * from kamura.quote_requests where id = $1", [quoteId]);
  if (!quote) throw new Error("Solicitud inexistente");
  const pd = parseDesign(quote.design);
  const summary = pd.ok ? summarizeDesign(pd.design) : null;
  const cat = pd.ok ? getCategory(pd.design.category) : undefined;
  const [render] = await db.query<{ data: Uint8Array; mime: string }>(
    "select data, mime from kamura.quote_files where quote_id = $1 and kind = 'render_perspectiva' limit 1",
    [quoteId],
  );
  const designLines = quote.summary.split("\n");
  const contactLines = [
    `Nombre: ${quote.customer_name}`,
    `WhatsApp / teléfono: ${quote.phone}`,
    `Correo: ${quote.email}`,
    ...(quote.city || quote.province ? [`Ubicación: ${[quote.city, quote.province].filter(Boolean).join(", ")}`] : []),
    ...(quote.comments ? [`Comentarios: ${quote.comments}`] : []),
  ];

  const adminTo = process.env.ADMIN_NOTIFY_EMAIL;
  let admin: EmailResult;
  if (!adminTo) {
    admin = { status: "skipped", reason: "ADMIN_NOTIFY_EMAIL no configurado." };
  } else {
    const adminUrl = `${siteUrl()}/admin/solicitudes/${quote.id}`;
    admin = await sendEmail({
      to: adminTo,
      replyTo: quote.email,
      subject: `Nueva solicitud ${quote.public_code}: ${summary?.category ?? "mueble"} en ${summary?.wood ?? ""}`,
      text: `Nueva solicitud ${quote.public_code}\n\n${contactLines.join("\n")}\n\n${quote.summary}\n\nVer en el panel: ${adminUrl}`,
      html: emailHtml(
        `Nueva solicitud ${quote.public_code}`,
        `Llegó un nuevo diseño desde el configurador. <a href="${escapeHtml(adminUrl)}">Abrir en el panel</a>.`,
        [
          { title: "Contacto", lines: contactLines },
          { title: "Diseño", lines: designLines },
        ],
        "La imagen adjunta es una vista orientativa del modelo 3D. Los datos completos están en el panel.",
      ),
      attachments: render ? [{ filename: `${quote.public_code}.jpg`, content: new Uint8Array(render.data) }] : undefined,
    });
  }

  const tokenNote = "Guardá este correo: incluye el código de tu solicitud.";
  const customer = await sendEmail({
    to: quote.email,
    subject: `Recibimos tu diseño (${quote.public_code})`,
    text: `Hola ${quote.customer_name}:\n\nRecibimos tu solicitud de cotización ${quote.public_code}. El equipo de Kamura va a revisar tu diseño y se va a comunicar con vos para preparar una propuesta personalizada.\n\n${quote.summary}\n\n${tokenNote}`,
    html: emailHtml(
      "Recibimos tu diseño",
      `Hola ${escapeHtml(quote.customer_name)}: recibimos tu solicitud <strong>${escapeHtml(quote.public_code)}</strong>${cat ? ` para ${escapeHtml(cat.article)} ${escapeHtml(cat.singular)}` : ""}. El equipo de Kamura va a revisar tu diseño y se va a comunicar con vos para preparar una propuesta personalizada.`,
      [{ title: "Tu diseño", lines: designLines }],
      `${tokenNote} Las texturas y medidas del configurador son orientativas; el equipo confirmará todos los detalles con vos.`,
    ),
  });

  const notifications = { admin: admin.status, customer: customer.status, updatedAt: new Date().toISOString() };
  await db.query("update kamura.quote_requests set notifications = $2::jsonb where id = $1", [quoteId, JSON.stringify(notifications)]);
  for (const [who, r] of [
    ["admin", admin],
    ["cliente", customer],
  ] as const) {
    if (r.status === "failed") await addEvent(db.query, quoteId, "notificacion_fallida", { destinatario: who, error: r.error });
    else if (r.status === "sent") await addEvent(db.query, quoteId, "notificacion_enviada", { destinatario: who });
    else await addEvent(db.query, quoteId, "notificacion_omitida", { destinatario: who, motivo: r.reason });
  }
  return { admin, customer };
}

/* ---------------- Panel administrativo ---------------- */

export interface QuoteFilters {
  q?: string;
  status?: string;
  category?: string;
  from?: string;
  to?: string;
  page?: number;
}

export const PAGE_SIZE = 25;

export interface QuoteListItem {
  id: string;
  public_code: string;
  created_at: string;
  status: EstadoId;
  customer_name: string;
  phone: string;
  email: string;
  city: string | null;
  province: string | null;
  category: string;
  wood: string;
  design: unknown;
  notifications: Record<string, string>;
}

function buildWhere(f: QuoteFilters): { where: string; params: unknown[] } {
  const conds: string[] = [];
  const params: unknown[] = [];
  if (f.q?.trim()) {
    params.push(`%${f.q.trim().toLowerCase()}%`);
    const i = params.length;
    params.push(f.q.replace(/\D/g, "") ? `%${f.q.replace(/\D/g, "")}%` : "__sin_numeros__");
    const j = params.length;
    conds.push(
      `(lower(customer_name) like $${i} or lower(email) like $${i} or lower(public_code) like $${i} or regexp_replace(phone, '\\D', '', 'g') like $${j})`,
    );
  }
  if (f.status && (ESTADO_IDS as readonly string[]).includes(f.status)) {
    params.push(f.status);
    conds.push(`status = $${params.length}`);
  }
  if (f.category && getCategory(f.category)) {
    params.push(f.category);
    conds.push(`category = $${params.length}`);
  }
  if (f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from)) {
    params.push(f.from);
    conds.push(`created_at >= $${params.length}::date`);
  }
  if (f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to)) {
    params.push(f.to);
    conds.push(`created_at < $${params.length}::date + interval '1 day'`);
  }
  return { where: conds.length ? `where ${conds.join(" and ")}` : "", params };
}

export async function listQuotes(f: QuoteFilters, pageSize = PAGE_SIZE): Promise<{ items: QuoteListItem[]; total: number }> {
  const db = await getDb();
  const { where, params } = buildWhere(f);
  const page = Math.max(1, f.page ?? 1);
  const [{ total }] = await db.query<{ total: number }>(`select count(*)::int as total from kamura.quote_requests ${where}`, params);
  const items = await db.query<QuoteListItem>(
    `select id, public_code, created_at, status, customer_name, phone, email, city, province, category, wood, design, notifications
     from kamura.quote_requests ${where} order by created_at desc limit ${pageSize} offset ${(page - 1) * pageSize}`,
    params,
  );
  return { items, total: Number(total) };
}

export async function getQuote(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await getDb();
  const [quote] = await db.query<Record<string, unknown>>("select * from kamura.quote_requests where id = $1", [id]);
  if (!quote) return null;
  const files = await db.query<{ id: string; kind: string; mime: string; size: number; filename: string; created_at: string }>(
    "select id, kind, mime, size, filename, created_at from kamura.quote_files where quote_id = $1 order by created_at",
    [id],
  );
  const notes = await db.query<{ id: string; body: string; created_at: string }>(
    "select id, body, created_at from kamura.quote_notes where quote_id = $1 order by created_at desc",
    [id],
  );
  const events = await db.query<{ id: string; type: string; detail: Record<string, unknown>; created_at: string }>(
    "select id, type, detail, created_at from kamura.quote_events where quote_id = $1 order by created_at desc",
    [id],
  );
  return { quote, files, notes, events };
}

export async function updateQuoteStatus(id: string, status: string): Promise<boolean> {
  if (!(ESTADO_IDS as readonly string[]).includes(status)) return false;
  const db = await getDb();
  return db.tx(async (q) => {
    const [prev] = await q<{ status: string }>("select status from kamura.quote_requests where id = $1 for update", [id]);
    if (!prev) return false;
    if (prev.status === status) return true;
    await q("update kamura.quote_requests set status = $2, updated_at = now() where id = $1", [id, status]);
    await addEvent(q, id, "estado", { de: estadoLabel(prev.status), a: estadoLabel(status) });
    return true;
  });
}

export async function addQuoteNote(id: string, body: string): Promise<boolean> {
  const text = body.trim();
  if (!text || text.length > 4000) return false;
  const db = await getDb();
  const exists = await db.query("select 1 from kamura.quote_requests where id = $1", [id]);
  if (!exists.length) return false;
  await db.query("insert into kamura.quote_notes (id, quote_id, body) values ($1, $2, $3)", [newId(), id, text]);
  await db.query("update kamura.quote_requests set updated_at = now() where id = $1", [id]);
  return true;
}

export async function getQuoteFile(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const db = await getDb();
  const [file] = await db.query<{ data: Uint8Array; mime: string; filename: string; quote_id: string; kind: string }>(
    "select data, mime, filename, quote_id, kind from kamura.quote_files where id = $1",
    [id],
  );
  return file ?? null;
}

/* ---------------- Diseños compartidos ---------------- */

export async function saveSharedDesign(design: unknown, ipHash: string): Promise<{ token: string } | { error: string; status: number }> {
  const pd = parseDesign(design);
  if (!pd.ok) return { error: pd.error, status: 422 };
  if (!(await rateLimit(`design:${ipHash}`, 30, 3600))) {
    return { error: "Guardaste muchos diseños seguidos. Esperá un rato y volvé a intentar.", status: 429 };
  }
  const { newToken } = await import("./security");
  const token = newToken();
  const db = await getDb();
  await db.query(
    "insert into kamura.shared_designs (token_hash, design, expires_at) values ($1, $2::jsonb, now() + ($3 || ' days')::interval)",
    [sha256(token), JSON.stringify(pd.design), String(SHARED_DESIGN_DAYS)],
  );
  return { token };
}

export async function loadSharedDesign(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const db = await getDb();
  const [row] = await db.query<{ design: unknown; quote_id: string | null }>(
    "update kamura.shared_designs set last_accessed_at = now() where token_hash = $1 and expires_at > now() returning design, quote_id",
    [sha256(token)],
  );
  if (!row) return null;
  const pd = parseDesign(row.design);
  return pd.ok ? { design: pd.design, fromQuote: Boolean(row.quote_id) } : null;
}
