"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const res = await fetch("/api/admin/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        }).catch(() => null);
        const data = await res?.json().catch(() => ({}));
        setBusy(false);
        if (!res?.ok) {
          setError(data?.error ?? "No se pudo ingresar.");
          return;
        }
        router.replace("/admin");
        router.refresh();
      }}
    >
      <div className="field">
        <label htmlFor="pw">Contraseña</label>
        <input id="pw" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      </div>
      {error && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary btn-block" disabled={busy}>
        {busy ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
