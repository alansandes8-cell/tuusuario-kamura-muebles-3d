import Image from "next/image";
import Link from "next/link";
import { CategoryCard } from "@/components/site/CategoryCard";
import { JsonLd } from "@/components/site/JsonLd";
import { WoodStrip } from "@/components/site/WoodStrip";
import { MARCA, siteUrl } from "@/config/marca";
import { CATEGORIES } from "@/lib/catalog";
import { WOOD_DISCLAIMER } from "@/lib/woods";

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Diseñá tu mueble | Kamura Muebles",
          url: siteUrl(),
          publisher: { "@type": "Organization", name: MARCA.nombre, url: MARCA.sitioPrincipal },
        }}
      />
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="eyebrow">Configurador 3D · Muebles a medida</p>
            <h1>Diseñá tu mueble. Nosotros lo hacemos realidad.</h1>
            <p className="lead">
              Personalizá tu próximo mueble en madera, explorá distintas posibilidades y enviá tu diseño a Kamura para
              recibir una cotización a medida.
            </p>
            <div className="hero-actions">
              <Link href="/muebles" className="btn btn-primary btn-lg">
                Crear mi mueble
              </Link>
              <Link href="#como-funciona" className="btn btn-outline btn-lg">
                Cómo funciona
              </Link>
            </div>
            <p className="small muted" style={{ marginTop: 18 }}>
              Sin registrarte. Sin precios automáticos: cada proyecto lo cotiza el equipo de Kamura.
            </p>
          </div>
          <div className="hero-visual">
            <Image src="/renders/hero.jpg" alt="Mesa de comedor de madera diseñada en el configurador 3D" width={1200} height={960} priority />
            <span className="caption">Vista generada en el configurador</span>
          </div>
        </div>
      </section>

      <section className="section section-alt" aria-labelledby="titulo-categorias">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Elegí por dónde empezar</p>
              <h2 id="titulo-categorias">¿Qué mueble querés crear?</h2>
              <p>Cada mueble tiene su propio modelo 3D, sus medidas y sus opciones. Empezás desde un diseño base y lo ajustás a tu espacio.</p>
            </div>
            <Link href="/muebles" className="btn btn-outline">
              Ver todos
            </Link>
          </div>
          <div className="category-grid">
            {CATEGORIES.map((c, i) => (
              <CategoryCard key={c.id} cat={c} priority={i < 3} />
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="como-funciona" aria-labelledby="titulo-como">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Cómo funciona</p>
              <h2 id="titulo-como">De la idea al taller, en pocos minutos</h2>
            </div>
          </div>
          <ol className="steps-grid" style={{ padding: 0, margin: 0 }}>
            <li>
              <h3>Elegí el mueble</h3>
              <p>Mesas, bibliotecas, racks, camas y más. Cada uno arranca con un diseño base pensado para adaptarse.</p>
            </li>
            <li>
              <h3>Personalizalo en 3D</h3>
              <p>Cambiá medidas, madera y detalles y miralo desde cualquier ángulo mientras lo ajustás.</p>
            </li>
            <li>
              <h3>Consultá al asistente</h3>
              <p>Si tenés dudas, pedile ayuda con las medidas o la madera. También puede aplicar los cambios por vos.</p>
            </li>
            <li>
              <h3>Pedí tu cotización</h3>
              <p>Enviá tu diseño con tus datos. El equipo de Kamura lo revisa y se comunica para preparar una propuesta.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="section section-alt" aria-labelledby="titulo-maderas">
        <div className="container">
          <div className="section-head">
            <div>
              <p className="eyebrow">Maderas</p>
              <h2 id="titulo-maderas">Seis maderas para elegir</h2>
              <p>{WOOD_DISCLAIMER}</p>
            </div>
          </div>
          <WoodStrip />
        </div>
      </section>

      {MARCA.fotosProyectos.length > 0 && (
        <section className="section" aria-labelledby="titulo-proyectos">
          <div className="container">
            <div className="section-head">
              <div>
                <p className="eyebrow">Trabajos de Kamura</p>
                <h2 id="titulo-proyectos">Proyectos realizados</h2>
              </div>
            </div>
            <div className="category-grid">
              {MARCA.fotosProyectos.map((f) => (
                <figure key={f.src} className="category-card" style={{ margin: 0 }}>
                  <div className="thumb">
                    <Image src={f.src} alt={f.alt} width={640} height={480} />
                  </div>
                  {f.titulo && (
                    <figcaption className="body">
                      <h3>{f.titulo}</h3>
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <div className="container" style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", alignItems: "center" }}>
          <div>
            <p className="eyebrow">Hecho a medida</p>
            <h2 style={{ fontSize: "clamp(1.7rem, 3vw, 2.4rem)" }}>Tu diseño es el punto de partida</h2>
          </div>
          <div>
            <p style={{ color: "var(--ink-2)" }}>
              Lo que armás en el configurador nos llega con todas las medidas y opciones. El equipo de Kamura revisa cada
              proyecto, confirma con vos los detalles de fabricación y prepara una cotización personalizada.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Link href="/muebles" className="btn btn-primary">
                Crear mi mueble
              </Link>
              <a href={MARCA.sitioPrincipal} className="btn btn-outline">
                Conocer Kamura
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
