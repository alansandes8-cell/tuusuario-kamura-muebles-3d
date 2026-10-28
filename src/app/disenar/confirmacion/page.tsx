import type { Metadata } from "next";
import { ConfirmationView } from "@/components/flow/ConfirmationView";

export const metadata: Metadata = { title: "Solicitud enviada", robots: { index: false } };

export default function ConfirmacionPage() {
  return <ConfirmationView />;
}
