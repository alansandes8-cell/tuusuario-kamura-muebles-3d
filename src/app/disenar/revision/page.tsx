import type { Metadata } from "next";
import { ReviewView } from "@/components/flow/ReviewView";

export const metadata: Metadata = { title: "Revisá tu diseño", robots: { index: false } };

export default function RevisionPage() {
  return <ReviewView />;
}
