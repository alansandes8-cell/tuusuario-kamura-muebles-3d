import type { Metadata } from "next";
import { QuoteForm } from "@/components/flow/QuoteForm";

export const metadata: Metadata = { title: "Solicitar cotización", robots: { index: false } };

export default function SolicitudPage() {
  return <QuoteForm turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY} />;
}
