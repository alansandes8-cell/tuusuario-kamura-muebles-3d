import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/site/JsonLd";
import { siteUrl } from "@/config/marca";
import { CATEGORIES, getCategoryBySlug } from "@/lib/catalog";
import { formatCm } from "@/lib/design/visibility";
import { WOODS } from "@/lib/woods";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const cat = getCategoryBySlug((await params).slug);
  if (!cat) return {};
  return {
    title: `${cat.name} de madera a medida`,
    description: cat.description,
    alternates: { canonical: `/muebles/${cat.slug}` },
    openGraph: { images: [`/renders/${cat.id}.jpg`] },
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const cat = getCategoryBySlug((await params).slug);
  if (!cat) notFound();
  return (
    <section className="section">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Inicio", item: siteUrl() },
            { "@type": "ListItem", position: 2, name: "Muebles", item: `${siteUrl()}/muebles` },
            { "@type": "ListItem", position: 3, name: cat.name, item: `${siteUrl()}/muebles/${cat.slug}` },
          ],
        }}
      />
      <div className="container">
        <nav className="breadcrumbs" aria-label="Ruta de navegación">
          <Link href="/">Inicio</Link> / <Link href="/muebles">Muebles</Link> / {cat.name}
        </nav>
        <div className="hero-grid">
          <div>
            <p className="eyebrow">{cat.tagline}</p>
            <h1 style={{ fontSize: "clamp(2rem, 4.5vw, 3.2rem)" }}>{cat.name} de madera a medida</h1>
            <p className="lead" style={{ fontSize: "1.1rem", color: "var(--ink-2)" }}>
              {cat.description}
            </p>
            <Link href={`/disenar/${cat.slug}`} className="btn btn-primary btn-lg">
              Diseñar {cat.article === "la" ? "mi" : "mi"} {cat.singular}
            </Link>
          </div>
          <div className="hero-visual">
            <Image src={`/renders/${cat.id}.jpg`} alt={`Modelo 3D de ${cat.singular}`} width={960} height={720} priority />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 32, marginTop: 56 }}>
          <div>
            <h2 style={{ fontSize: "1.4rem" }}>Estilos para empezar</h2>
            <ul style={{ paddingLeft: 18, color: "var(--ink-2)" }}>
              {cat.templates.map((t) => (
                <li key={t.id} style={{ marginBottom: 8 }}>
                  <Link href={`/disenar/${cat.slug}?plantilla=${t.id}`}>
                    <strong>{t.name}</strong>
                  </Link>
                  : {t.description}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 style={{ fontSize: "1.4rem" }}>Medidas que podés ajustar</h2>
            <ul style={{ paddingLeft: 18, color: "var(--ink-2)" }}>
              {cat.dimensions.map((d) => (
                <li key={d.key}>
                  {d.label}: entre {formatCm(d.min)} y {formatCm(d.max)}
                </li>
              ))}
            </ul>
            <p className="small muted">Medidas orientativas del configurador. Kamura confirma la viabilidad de cada proyecto.</p>
          </div>
          <div>
            <h2 style={{ fontSize: "1.4rem" }}>Opciones y maderas</h2>
            <p style={{ color: "var(--ink-2)" }}>
              {cat.options
                .filter((o) => o.group !== "Vista")
                .map((o) => o.label.toLowerCase())
                .join(", ")}
              .
            </p>
            <p style={{ color: "var(--ink-2)" }}>Maderas: {WOODS.map((w) => w.name).join(", ")}.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
