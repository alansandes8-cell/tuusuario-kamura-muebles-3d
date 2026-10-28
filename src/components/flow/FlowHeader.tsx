import Link from "next/link";
import { Logo } from "@/components/site/SiteHeader";
import { Icon } from "@/components/ui/Icon";

export function FlowHeader({ backHref, backLabel = "Volver al configurador" }: { backHref?: string; backLabel?: string }) {
  return (
    <header className="site-header">
      <div className="container">
        <Logo />
        {backHref && (
          <Link href={backHref} className="btn btn-ghost btn-sm">
            <Icon name="arrowLeft" size={16} />
            {backLabel}
          </Link>
        )}
      </div>
    </header>
  );
}

export function NoDesign() {
  return (
    <div className="container" style={{ padding: "64px 24px", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.8rem" }}>Todavía no hay un diseño en curso</h1>
      <p className="muted">Elegí un mueble para empezar a diseñarlo.</p>
      <Link href="/muebles" className="btn btn-primary">
        Elegir mueble
      </Link>
    </div>
  );
}

export function FlowLoading() {
  return (
    <div className="viewer-loading" style={{ position: "relative", minHeight: "50dvh" }}>
      <span className="spinner" />
    </div>
  );
}
