"use client";
import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AttachmentPicker } from "@/components/configurator/AttachmentPicker";
import { ValidationNotices } from "@/components/configurator/SummaryPanel";
import { Icon } from "@/components/ui/Icon";
import { Viewer } from "@/components/viewer/Viewer";
import type { ViewerHandle } from "@/components/viewer/types";
import { track } from "@/lib/analytics";
import { getCategory } from "@/lib/catalog";
import { summarizeDesign, summaryText } from "@/lib/design/summary";
import { validateDesign } from "@/lib/design/validation";
import { dataUrlToBlob } from "@/lib/images";
import { contactSchema, PROVINCIAS, type QuoteConfirmation } from "@/lib/quote/contact";
import { useConfigurator } from "@/lib/store/configurator";
import { FlowHeader, FlowLoading, NoDesign } from "./FlowHeader";
import { readSource } from "./SourceCapture";
import { useFlowDesign } from "./useFlowDesign";

export const CONFIRMATION_KEY = "kamura-confirmacion";

type Fields = { name: string; phone: string; email: string; city: string; province: string; comments: string };
const EMPTY: Fields = { name: "", phone: "", email: "", city: "", province: "", comments: "" };

declare global {
  interface Window {
    turnstile?: { reset: (id?: string) => void };
  }
}

export function QuoteForm({ turnstileSiteKey }: { turnstileSiteKey?: string }) {
  const router = useRouter();
  const { hydrated, design } = useFlowDesign();
  const attachments = useConfigurator((s) => s.attachments);
  const changeLog = useConfigurator((s) => s.changeLog);
  const viewer = useRef<ViewerHandle | null>(null);
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");
  const startedAt = useRef(Date.now());
  // La misma clave se reutiliza en los reintentos: evita solicitudes duplicadas.
  const idempotencyKey = useRef<string>("");
  const honeypot = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    idempotencyKey.current = crypto.randomUUID();
  }, []);

  useEffect(() => {
    if (design) track("cotizacion_iniciada", { categoria: design.category }, { once: true });
  }, [design]);

  if (!hydrated) return <FlowLoading />;
  if (!design) {
    return (
      <div className="flow">
        <FlowHeader />
        <NoDesign />
      </div>
    );
  }

  const cat = getCategory(design.category)!;
  const summary = summarizeDesign(design);
  const blocked = validateDesign(design).errors.length > 0;

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFields((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending" || blocked) return;
    const parsed = contactSchema.safeParse(fields);
    if (!parsed.success) {
      const next: Partial<Record<keyof Fields, string>> = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof Fields] ??= issue.message;
      setErrors(next);
      const first = Object.keys(next)[0];
      document.getElementById(`q-${first}`)?.focus();
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      const body = new FormData();
      const turnstileToken = form.current ? new FormData(form.current).get("cf-turnstile-response") : null;
      body.append(
        "payload",
        JSON.stringify({
          design,
          contact: parsed.data,
          changeLog: changeLog.filter((c) => c.category === design.category).slice(-40),
          source: readSource(),
          idempotencyKey: idempotencyKey.current,
          startedAt: startedAt.current,
          website: honeypot.current?.value ?? "",
          turnstileToken: turnstileToken ? String(turnstileToken) : undefined,
        }),
      );
      for (const view of ["perspectiva", "frente"] as const) {
        const url = viewer.current?.capture(view, 1200, 900);
        if (url) body.append(`render_${view}`, dataUrlToBlob(url), `${view}.jpg`);
      }
      attachments.forEach((f) => body.append("adjunto", f, f.name));

      const res = await fetch("/api/quotes", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        window.turnstile?.reset();
        throw new Error(data.error ?? "No pudimos enviar tu solicitud.");
      }
      const confirmation: QuoteConfirmation = {
        code: data.code,
        token: data.token,
        category: design.category,
        customerEmail: data.customerEmail ?? (data.duplicate ? "skipped" : "failed"),
        summary: summaryText(design),
      };
      sessionStorage.setItem(CONFIRMATION_KEY, JSON.stringify(confirmation));
      track("cotizacion_enviada", { categoria: design.category, madera: design.wood });
      router.push("/disenar/confirmacion");
    } catch (err) {
      setStatus("error");
      setMessage(
        err instanceof TypeError
          ? "No hay conexión. Tu diseño y tus datos siguen acá: revisá la conexión y volvé a intentar."
          : err instanceof Error
            ? err.message
            : "No pudimos enviar tu solicitud.",
      );
    }
  };

  const field = (k: keyof Fields, label: string, opts: { type?: string; required?: boolean; autoComplete?: string; hint?: string; full?: boolean } = {}) => (
    <div className={`field ${opts.full ? "full" : ""}`}>
      <label htmlFor={`q-${k}`}>
        {label} {opts.required ? <span aria-hidden="true">*</span> : <span className="muted small">(opcional)</span>}
      </label>
      <input
        id={`q-${k}`}
        className="input"
        type={opts.type ?? "text"}
        value={fields[k]}
        onChange={set(k)}
        autoComplete={opts.autoComplete}
        required={opts.required}
        aria-invalid={Boolean(errors[k])}
        aria-describedby={errors[k] ? `q-${k}-err` : undefined}
      />
      {opts.hint && !errors[k] && <p className="hint">{opts.hint}</p>}
      {errors[k] && (
        <p className="field-error" id={`q-${k}-err`}>
          {errors[k]}
        </p>
      )}
    </div>
  );

  return (
    <div className="flow">
      <FlowHeader backHref={`/disenar/${cat.slug}`} />
      <main className="flow-main" id="contenido">
        <div className="container">
          <p className="eyebrow">Último paso</p>
          <h1 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)" }}>Solicitá tu cotización</h1>
          <div className="flow-grid">
            <div>
              <div className="flow-viewer">
                <Viewer design={design} handleRef={viewer} hint={false} />
              </div>
            </div>
            <div>
              <div className="card">
                <p style={{ color: "var(--ink-2)", marginBottom: 14 }}>
                  El equipo de Kamura revisará tu diseño y se comunicará con vos para preparar una propuesta
                  personalizada. Te enviamos el diseño completo, con medidas, madera, opciones e imágenes.
                </p>
                <p className="small" style={{ background: "var(--surface-2)", padding: "10px 12px", borderRadius: 10, marginBottom: 18 }}>
                  <strong>{summary.category}</strong> en {summary.wood} · {summary.overall.ancho} ×{" "}
                  {summary.overall.profundidad} × {summary.overall.alto} cm ·{" "}
                  <Link href="/disenar/revision">Ver detalle</Link>
                </p>
                <ValidationNotices design={design} />
                {blocked ? (
                  <Link href={`/disenar/${cat.slug}?paso=medidas`} className="btn btn-primary btn-block">
                    Corregir el diseño
                  </Link>
                ) : (
                  <form ref={form} onSubmit={submit} noValidate>
                    <div className="form-grid">
                      {field("name", "Nombre y apellido", { required: true, autoComplete: "name", full: true })}
                      {field("phone", "WhatsApp o teléfono", { required: true, type: "tel", autoComplete: "tel", hint: "Con código de área, por ejemplo 11 2345 6789." })}
                      {field("email", "Correo electrónico", { required: true, type: "email", autoComplete: "email" })}
                      {field("city", "Localidad", { autoComplete: "address-level2" })}
                      <div className="field">
                        <label htmlFor="q-province">
                          Provincia <span className="muted small">(opcional)</span>
                        </label>
                        <select id="q-province" className="select" value={fields.province} onChange={set("province")}>
                          <option value="">Elegir…</option>
                          {PROVINCIAS.map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field full">
                        <label htmlFor="q-comments">
                          Comentarios adicionales <span className="muted small">(opcional)</span>
                        </label>
                        <textarea id="q-comments" className="textarea" value={fields.comments} onChange={set("comments")} maxLength={2000} />
                        {errors.comments && <p className="field-error">{errors.comments}</p>}
                      </div>
                      <div className="full" style={{ marginBottom: 18 }}>
                        <AttachmentPicker />
                      </div>
                    </div>
                    <div className="hp-field" aria-hidden="true">
                      <label htmlFor="q-web">No completar este campo</label>
                      <input id="q-web" ref={honeypot} name="empresa_web" tabIndex={-1} autoComplete="off" />
                    </div>
                    {turnstileSiteKey && (
                      <>
                        <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
                        <div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-language="es" style={{ marginBottom: 14 }} />
                      </>
                    )}
                    {status === "error" && (
                      <p className="notice notice-error" role="alert">
                        <Icon name="alert" /> {message}
                      </p>
                    )}
                    <button type="submit" className="btn btn-quote btn-lg btn-block" disabled={status === "sending"}>
                      {status === "sending" ? (
                        <>
                          <span className="spinner" /> Enviando…
                        </>
                      ) : status === "error" ? (
                        "Reintentar envío"
                      ) : (
                        "Solicitar cotización"
                      )}
                    </button>
                    <p className="small muted" style={{ marginTop: 12 }}>
                      Al enviar, aceptás que Kamura use estos datos para responder tu consulta, según la{" "}
                      <Link href="/privacidad">política de privacidad</Link>. No mostramos precios automáticos: la cotización la prepara el equipo.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
