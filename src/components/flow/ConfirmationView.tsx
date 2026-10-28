"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCategory } from "@/lib/catalog";
import type { QuoteConfirmation } from "@/lib/quote/contact";
import { hydrateConfigurator, useConfigurator } from "@/lib/store/configurator";
import { FlowHeader } from "./FlowHeader";
import { CONFIRMATION_KEY } from "./QuoteForm";

export function ConfirmationView() {
  const [data, setData] = useState<QuoteConfirmation | null | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const hydrated = useConfigurator((s) => s.hydrated);

  useEffect(() => {
    hydrateConfigurator();
    try {
      setData(JSON.parse(sessionStorage.getItem(CONFIRMATION_KEY) ?? "null"));
    } catch {
      setData(null);
    }
  }, []);

  // El diseño enviado se quita del borrador local (queda recuperable con el enlace privado).
  useEffect(() => {
    if (!hydrated || !data) return;
    const s = useConfigurator.getState();
    if (s.active === data.category) s.clearAfterSubmit();
  }, [hydrated, data]);

  if (data === undefined) return null;
  if (!data) {
    return (
      <div className="flow">
        <FlowHeader />
        <div className="container" style={{ padding: "64px 24px" }}>
          <h1 style={{ fontSize: "1.8rem" }}>No encontramos una solicitud reciente</h1>
          <Link href="/muebles" className="btn btn-primary">
            Diseñar un mueble
          </Link>
        </div>
      </div>
    );
  }
  const cat = getCategory(data.category);
  const link = typeof window !== "undefined" ? `${window.location.origin}/proyecto/${data.token}` : "";

  return (
    <div className="flow">
      <FlowHeader />
      <main className="flow-main" id="contenido">
        <div className="container" style={{ maxWidth: 760 }}>
          <div className="card">
            <p className="eyebrow">Solicitud enviada</p>
            <h1 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.4rem)" }}>¡Gracias! Recibimos tu diseño.</h1>
            <p style={{ color: "var(--ink-2)" }}>
              Guardamos tu solicitud{cat ? ` para ${cat.article === "la" ? "una" : "un"} ${cat.singular}` : ""}. El equipo de Kamura va a revisar el diseño y
              se va a comunicar con vos para preparar una propuesta personalizada.
            </p>
            <p className="small muted" style={{ margin: 0 }}>
              Código de tu solicitud
            </p>
            <div className="code-box" aria-label="Código de solicitud">
              {data.code}
            </div>
            {data.customerEmail === "sent" ? (
              <p className="notice notice-ok">Te enviamos un correo con el resumen. Si no lo ves, revisá la carpeta de correo no deseado.</p>
            ) : (
              <p className="notice notice-info">Guardá el código de tu solicitud por si necesitás consultarla.</p>
            )}

            <h2 style={{ fontSize: "1.2rem", marginTop: 24 }}>Enlace privado de tu diseño</h2>
            <p className="small" style={{ color: "var(--ink-2)" }}>
              Con este enlace podés volver a ver tu diseño o usarlo como base para otro. No muestra tus datos personales.
            </p>
            <div className="copy-row">
              <input className="input" readOnly value={link} aria-label="Enlace privado del diseño" onFocus={(e) => e.target.select()} />
              <button
                type="button"
                className="btn btn-outline"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? "Copiado" : "Copiar"}
              </button>
            </div>

            <h2 style={{ fontSize: "1.2rem", marginTop: 24 }}>Resumen</h2>
            <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.9rem", background: "var(--surface-2)", padding: 16, borderRadius: 10, margin: 0 }}>
              {data.summary}
            </pre>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 24 }}>
              <Link href="/muebles" className="btn btn-primary">
                Diseñar otro mueble
              </Link>
              <Link href="/" className="btn btn-outline">
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
