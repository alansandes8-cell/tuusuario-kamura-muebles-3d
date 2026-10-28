"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ESTADOS } from "@/config/estados";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      style={{ color: "inherit" }}
      onClick={async () => {
        await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
        router.replace("/admin/ingresar");
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [state, setState] = useState<"idle" | "saving" | "error" | "ok">("idle");
  return (
    <div className="field" style={{ marginBottom: 0 }}>
      <label htmlFor="estado">Estado</label>
      <select
        id="estado"
        className="select"
        value={value}
        disabled={state === "saving"}
        onChange={async (e) => {
          const next = e.target.value;
          const prev = value;
          setValue(next);
          setState("saving");
          const res = await fetch(`/api/admin/quotes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: next }),
          }).catch(() => null);
          if (!res?.ok) {
            setValue(prev);
            setState("error");
            return;
          }
          setState("ok");
          router.refresh();
        }}
      >
        {ESTADOS.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
      {state === "error" && <p className="field-error">No se pudo guardar el estado. Intentá de nuevo.</p>}
      {state === "ok" && <p className="hint">Estado actualizado.</p>}
    </div>
  );
}

export function NoteForm({ id }: { id: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!body.trim()) return;
        setBusy(true);
        setError("");
        const res = await fetch(`/api/admin/quotes/${id}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        }).catch(() => null);
        setBusy(false);
        if (!res?.ok) {
          setError("No se pudo guardar la nota.");
          return;
        }
        setBody("");
        router.refresh();
      }}
    >
      <div className="field">
        <label htmlFor="nota">Nueva nota interna</label>
        <textarea id="nota" className="textarea" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} placeholder="Solo visible para el equipo." />
      </div>
      {error && <p className="field-error">{error}</p>}
      <button className="btn btn-outline btn-sm" disabled={busy || !body.trim()}>
        {busy ? "Guardando…" : "Agregar nota"}
      </button>
    </form>
  );
}
