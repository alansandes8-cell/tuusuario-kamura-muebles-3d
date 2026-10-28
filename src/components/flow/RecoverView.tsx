"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { SummaryList } from "@/components/configurator/SummaryPanel";
import { Viewer } from "@/components/viewer/Viewer";
import { getCategory } from "@/lib/catalog";
import type { Design } from "@/lib/design/design";
import { hydrateConfigurator, useConfigurator } from "@/lib/store/configurator";
import { FlowHeader } from "./FlowHeader";

export function RecoverView({ design, fromQuote }: { design: Design; fromQuote: boolean }) {
  const router = useRouter();
  const hydrated = useConfigurator((s) => s.hydrated);
  const cat = getCategory(design.category)!;
  useEffect(() => {
    hydrateConfigurator();
  }, []);

  const continueEditing = () => {
    useConfigurator.getState().loadDesign(design);
    router.push(`/disenar/${cat.slug}`);
  };

  return (
    <div className="flow">
      <FlowHeader />
      <main className="flow-main" id="contenido">
        <div className="container">
          <p className="eyebrow">Diseño guardado</p>
          <h1 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)" }}>Tu {cat.singular}</h1>
          <div className="flow-grid">
            <div className="flow-viewer">
              <Viewer design={design} hint={false} />
            </div>
            <div className="card">
              {fromQuote && (
                <p className="notice notice-info">
                  Este diseño ya se envió a Kamura. Si lo modificás, podés enviar una nueva solicitud.
                </p>
              )}
              <SummaryList design={design} />
              <button type="button" className="btn btn-primary btn-block btn-lg" onClick={continueEditing} disabled={!hydrated}>
                Seguir editando este diseño
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
