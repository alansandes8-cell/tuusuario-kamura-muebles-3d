"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SaveLinkButton } from "@/components/configurator/SaveLinkDialog";
import { SummaryList, ValidationNotices } from "@/components/configurator/SummaryPanel";
import { Viewer } from "@/components/viewer/Viewer";
import { track } from "@/lib/analytics";
import { getCategory } from "@/lib/catalog";
import { validateDesign } from "@/lib/design/validation";
import { WOOD_DISCLAIMER } from "@/lib/woods";
import type { StepId } from "@/lib/store/configurator";
import { FlowHeader, FlowLoading, NoDesign } from "./FlowHeader";
import { useFlowDesign } from "./useFlowDesign";

export function ReviewView() {
  const { hydrated, design } = useFlowDesign();
  if (!hydrated) return <FlowLoading />;
  if (!design) {
    return (
      <div className="flow">
        <FlowHeader />
        <NoDesign />
      </div>
    );
  }
  const cat = getCategory(design.category)!;
  const editHref = (step: StepId) => `/disenar/${cat.slug}?paso=${step}`;
  const blocked = validateDesign(design).errors.length > 0;
  return (
    <div className="flow">
      <FlowHeader backHref={`/disenar/${cat.slug}`} />
      <main className="flow-main" id="contenido">
        <div className="container">
          <p className="eyebrow">Revisión</p>
          <h1 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)" }}>Tu {cat.singular}</h1>
          <div className="flow-grid">
            <div className="flow-viewer">
              <Viewer design={design} initialDimensions hint={false} />
            </div>
            <div>
              <div className="card">
                <ValidationNotices design={design} />
                <SummaryListLinks design={design} editHref={editHref} />
                <p className="small muted">{WOOD_DISCLAIMER}</p>
              </div>
              <div className="card">
                <h2>¿Listo para cotizar?</h2>
                <p className="small" style={{ color: "var(--ink-2)" }}>
                  El equipo de Kamura revisará tu diseño y se comunicará con vos para preparar una propuesta personalizada.
                  No hace falta registrarte.
                </p>
                <div style={{ display: "grid", gap: 8 }}>
                  {blocked ? (
                    <Link href={editHref("medidas")} className="btn btn-primary btn-block">
                      Corregir el diseño
                    </Link>
                  ) : (
                    <Link href="/disenar/solicitud" className="btn btn-quote btn-lg btn-block" onClick={() => track("cotizacion_iniciada", { categoria: design.category })}>
                      Solicitar cotización
                    </Link>
                  )}
                  <Link href={`/disenar/${cat.slug}`} className="btn btn-outline btn-block">
                    Seguir editando
                  </Link>
                  <SaveLinkButton design={design} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function SummaryListLinks({ design, editHref }: { design: Parameters<typeof SummaryList>[0]["design"]; editHref: (s: StepId) => string }) {
  const router = useRouter();
  return <SummaryList design={design} onEdit={(step) => router.push(editHref(step))} />;
}
