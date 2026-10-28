import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="contenido" className="section">
        <div className="container" style={{ textAlign: "center" }}>
          <h1>No encontramos esta página</h1>
          <p className="muted">Puede que el enlace esté incompleto.</p>
          <Link href="/muebles" className="btn btn-primary">
            Diseñar un mueble
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
