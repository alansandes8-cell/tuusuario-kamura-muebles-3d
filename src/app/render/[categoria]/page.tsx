import { notFound } from "next/navigation";
import { RenderStage } from "@/components/viewer/RenderStage";
import { getCategoryBySlug } from "@/lib/catalog";
import { createDesign } from "@/lib/design/design";
import { isWoodId } from "@/lib/woods";

export const metadata = { robots: { index: false, follow: false } };

/**
 * Escenario sin interfaz para generar las imágenes del catálogo
 * (scripts/render-catalog.js). Deshabilitado en producción salvo que se
 * defina ENABLE_RENDER_ROUTE=1.
 */
export default async function RenderPage({
  params,
  searchParams,
}: {
  params: Promise<{ categoria: string }>;
  searchParams: Promise<{ plantilla?: string; madera?: string }>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.ENABLE_RENDER_ROUTE !== "1") notFound();
  const cat = getCategoryBySlug((await params).categoria);
  if (!cat) notFound();
  const sp = await searchParams;
  const design = createDesign(cat.id, sp.plantilla, sp.madera && isWoodId(sp.madera) ? sp.madera : undefined);
  return <RenderStage design={design} />;
}
