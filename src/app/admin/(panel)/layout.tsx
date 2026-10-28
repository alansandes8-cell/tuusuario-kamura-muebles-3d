import Link from "next/link";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/admin/AdminControls";
import { isAdmin } from "@/lib/server/auth";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin/ingresar");
  return (
    <div className="admin">
      <header className="admin-top">
        <div className="container">
          <Link href="/admin" style={{ textDecoration: "none", display: "flex", gap: 10, alignItems: "baseline" }}>
            <span className="logo-mark" style={{ fontSize: "1.25rem" }}>
              Kamura
            </span>
            <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>Solicitudes</span>
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="admin-main" id="contenido">
        <div className="container">{children}</div>
      </main>
    </div>
  );
}
