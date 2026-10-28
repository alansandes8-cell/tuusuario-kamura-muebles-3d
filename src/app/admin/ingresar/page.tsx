import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { adminConfigured, isAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ingresar al panel", robots: { index: false, follow: false } };

export default async function IngresarPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="admin" style={{ display: "grid", placeItems: "center", padding: 16 }}>
      <div className="card" style={{ width: "min(400px, 100%)" }}>
        <p className="logo-mark" style={{ margin: "0 0 4px" }}>
          Kamura
        </p>
        <h1 style={{ fontSize: "1.4rem" }}>Panel de solicitudes</h1>
        {adminConfigured() ? (
          <LoginForm />
        ) : (
          <p className="notice notice-warn">
            El acceso no está configurado. Definí ADMIN_PASSWORD_HASH en las variables de entorno (ver README).
          </p>
        )}
      </div>
    </div>
  );
}
