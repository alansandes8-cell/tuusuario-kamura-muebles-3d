import Image from "next/image";
import Link from "next/link";
import type { CategoryDefinition } from "@/lib/catalog";

export function CategoryCard({ cat, priority }: { cat: CategoryDefinition; priority?: boolean }) {
  return (
    <Link href={`/disenar/${cat.slug}`} className="category-card">
      <div className="thumb">
        <Image src={`/renders/${cat.id}.jpg`} alt={`Modelo 3D de ${cat.singular} generado en el configurador`} width={640} height={480} priority={priority} />
      </div>
      <div className="body">
        <h3>{cat.name}</h3>
        <p>{cat.tagline}</p>
        <span className="cta">Diseñar {cat.article === "la" ? "una" : "un"} {cat.singular} →</span>
      </div>
    </Link>
  );
}
