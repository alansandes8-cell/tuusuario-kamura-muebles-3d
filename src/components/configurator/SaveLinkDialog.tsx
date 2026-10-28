"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Design } from "@/lib/design/design";

/** Guarda el diseño en el servidor y entrega un enlace privado para retomarlo. */
export function SaveLinkButton({ design, compact }: { design: Design; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const save = async () => {
    setOpen(true);
    setState("saving");
    setCopied(false);
    try {
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ design }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "No pudimos guardar el diseño.");
      setUrl(`${window.location.origin}/proyecto/${data.token}`);
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos guardar el diseño.");
      setState("error");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <button type="button" className={compact ? "icon-btn" : "btn btn-ghost btn-sm"} onClick={save} title="Guardar y obtener un enlace" aria-label="Guardar y obtener un enlace">
        <Icon name="link" size={16} />
        {!compact && "Guardar enlace"}
      </button>
      {open && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="save-title" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="modal-card">
            <h2 id="save-title">Enlace privado de tu diseño</h2>
            {state === "saving" && (
              <p className="muted" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span className="spinner" /> Guardando…
              </p>
            )}
            {state === "done" && (
              <>
                <p className="small">
                  Con este enlace podés retomar el diseño desde cualquier dispositivo. Es privado: guardalo y compartilo solo con quien quieras.
                </p>
                <div className="copy-row">
                  <input className="input" readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Enlace privado" />
                  <button type="button" className="btn btn-primary" onClick={copy}>
                    {copied ? "Copiado" : "Copiar"}
                  </button>
                </div>
              </>
            )}
            {state === "error" && (
              <>
                <p className="notice notice-error">{error}</p>
                <p className="small muted">Tu diseño sigue guardado en este dispositivo.</p>
                <button type="button" className="btn btn-outline btn-sm" onClick={save}>
                  Reintentar
                </button>
              </>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
