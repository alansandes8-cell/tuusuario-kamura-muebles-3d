import type { Metadata } from "next";
import Link from "next/link";
import { FlowHeader } from "@/components/flow/FlowHeader";
import { RecoverView } from "@/components/flow/RecoverView";
import { loadSharedDesign } from "@/lib/server/quotes";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu diseño guardado", robots: { index: false, follow: false } };

export default async function ProyectoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await loadSharedDesign(token);
  if (!data) {
    return (
      <div className="flow">
        <FlowHeader />
        <div className="container" style={{ padding: "64px 24px" }}>
          <h1 style={{ fontSize: "1.8rem" }}>No encontramos este diseño</h1>
          <p className="muted">El enlace puede estar incompleto o haber vencido.</p>
          <Link href="/muebles" className="btn btn-primary">
            Diseñar un mueble
          </Link>
        </div>
      </div>
    );
  }
  return <RecoverView design={data.design} fromQuote={data.fromQuote} />;
}
