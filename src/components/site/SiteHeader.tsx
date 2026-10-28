import Link from "next/link";
import { MARCA } from "@/config/marca";

export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="Kamura Muebles, inicio">
      <span className="logo-mark">Kamura</span>
      <span className="logo-sub">Muebles</span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container">
        <Logo />
        <nav className="site-nav" aria-label="Principal">
          <Link href="/muebles" className="hide-mobile">
            Muebles
          </Link>
          <Link href="/#como-funciona" className="hide-mobile">
            Cómo funciona
          </Link>
          <a href={MARCA.sitioPrincipal} className="hide-mobile">
            Sitio de Kamura
          </a>
          <Link href="/muebles" className="btn btn-primary btn-sm">
            Crear mi mueble
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { contacto } = MARCA;
  return (
    <footer className="site-footer">
      <div className="container">
        <div>
          <p style={{ margin: "0 0 6px", fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--ink)" }}>Kamura Muebles</p>
          <p style={{ margin: 0 }}>{MARCA.descripcion}</p>
        </div>
        <nav aria-label="Pie de página">
          <a href={MARCA.sitioPrincipal}>kamuramuebles.com.ar</a>
          <Link href="/muebles">Diseñar un mueble</Link>
          <Link href="/privacidad">Privacidad</Link>
          {contacto.instagram && <a href={contacto.instagram}>Instagram</a>}
          {contacto.email && <a href={`mailto:${contacto.email}`}>{contacto.email}</a>}
          {contacto.whatsapp && <a href={`https://wa.me/${contacto.whatsapp.replace(/\D/g, "")}`}>WhatsApp</a>}
        </nav>
      </div>
    </footer>
  );
}
