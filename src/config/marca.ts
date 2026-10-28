/**
 * Datos de la marca. Los datos de contacto se cargan por variables de entorno
 * para no publicar información que Kamura no haya confirmado.
 */
export interface FotoProyecto {
  /** Ruta dentro de /public, por ejemplo "/proyectos/mesa-comedor.jpg". */
  src: string;
  alt: string;
  titulo?: string;
}

export const MARCA = {
  nombre: "Kamura Muebles",
  sitioPrincipal: "https://kamuramuebles.com.ar/",
  descripcion: "Carpintería artesanal y muebles de madera a medida.",
  contacto: {
    whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "",
    email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
    instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "",
  },
  /**
   * Fotografías reales de trabajos de Kamura. Copiarlas a /public/proyectos y
   * listarlas acá. Mientras la lista esté vacía, la sección no se muestra.
   */
  fotosProyectos: [] as FotoProyecto[],
};

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
