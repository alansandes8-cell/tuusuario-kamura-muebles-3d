import type { Metadata } from "next";
import { CategoryCard } from "@/components/site/CategoryCard";
import { CATEGORIES } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Elegí tu mueble",
  description: "Elegí el tipo de mueble de madera que querés diseñar a medida: mesas, bases de cama, racks de TV, escritorios, bibliotecas y más.",
  alternates: { canonical: "/muebles" },
};

export default function MueblesPage() {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <p className="eyebrow">Paso 1</p>
            <h1 style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>¿Qué mueble querés diseñar?</h1>
            <p>Elegí una categoría para abrir el configurador 3D. Siempre vas a poder cambiar de mueble sin perder lo que hiciste.</p>
          </div>
        </div>
        <div className="category-grid">
          {CATEGORIES.map((c, i) => (
            <CategoryCard key={c.id} cat={c} priority={i < 6} />
          ))}
        </div>
      </div>
    </section>
  );
}
