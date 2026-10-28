import "@fontsource-variable/fraunces";
import "@fontsource-variable/manrope";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { SourceCapture } from "@/components/flow/SourceCapture";
import { Analytics } from "@/components/site/Analytics";
import { siteUrl } from "@/config/marca";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Diseñá tu mueble a medida | Kamura Muebles",
    template: "%s | Kamura Muebles",
  },
  description:
    "Personalizá tu próximo mueble en madera, explorá distintas posibilidades en 3D y enviá tu diseño a Kamura para recibir una cotización a medida.",
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Kamura Muebles",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f7f3ed",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR">
      <body>
        <a href="#contenido" className="skip-link">
          Saltar al contenido
        </a>
        {children}
        <SourceCapture />
        <Analytics />
      </body>
    </html>
  );
}
