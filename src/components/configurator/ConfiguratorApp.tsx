"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { Icon } from "@/components/ui/Icon";
import { Viewer } from "@/components/viewer/Viewer";
import { track } from "@/lib/analytics";
import { getCategory, type CategoryId } from "@/lib/catalog";
import { hydrateConfigurator, STEPS, useActiveDesign, useConfigurator, type StepId } from "@/lib/store/configurator";
import { woodOrDefault } from "@/lib/woods";
import { SaveLinkButton } from "./SaveLinkDialog";
import { StepDesign } from "./StepDesign";
import { StepDetails } from "./StepDetails";
import { StepDimensions } from "./StepDimensions";
import { StepStyle } from "./StepStyle";
import { StepWood } from "./StepWood";
import { SummaryPanel } from "./SummaryPanel";
import { useWoodSwatch } from "./useWoodSwatch";

interface Props {
  categoryId: CategoryId;
  templateId?: string;
  step?: StepId;
}

export function ConfiguratorApp({ categoryId, templateId, step: initialStep }: Props) {
  const router = useRouter();
  const hydrated = useConfigurator((s) => s.hydrated);
  const active = useConfigurator((s) => s.active);
  const step = useConfigurator((s) => s.step);
  const setStep = useConfigurator((s) => s.setStep);
  const start = useConfigurator((s) => s.start);
  const undo = useConfigurator((s) => s.undo);
  const redo = useConfigurator((s) => s.redo);
  const canUndo = useConfigurator((s) => s.past.length > 0);
  const canRedo = useConfigurator((s) => s.future.length > 0);
  const design = useActiveDesign();
  const [rightTab, setRightTab] = useState<"asistente" | "resumen">("asistente");
  const [sheet, setSheet] = useState<"asistente" | "resumen" | null>(null);
  const [initialized, setInitialized] = useState(false);
  const swatch = useWoodSwatch(design ? woodOrDefault(design.wood) : undefined, 48);

  useEffect(() => {
    hydrateConfigurator();
  }, []);

  // Al cargar, se activa la categoría de la URL (y la plantilla pedida, si hay).
  useEffect(() => {
    if (!hydrated || initialized) return;
    start(categoryId, templateId);
    if (initialStep) setStep(initialStep);
    setInitialized(true);
    track("configurador_visita", { categoria: categoryId }, { once: true });
  }, [hydrated, initialized, categoryId, templateId, initialStep, start, setStep]);

  // Si el mueble cambia (desde el panel o el asistente), se actualiza la URL.
  useEffect(() => {
    if (!initialized || !active || active === categoryId) return;
    router.replace(`/disenar/${getCategory(active)!.slug}`, { scroll: false });
  }, [active, categoryId, initialized, router]);

  // Atajos de teclado para deshacer y rehacer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  if (!design || !initialized) {
    return (
      <div className="cfg" aria-busy="true">
        <div className="viewer-loading">
          <span className="spinner" />
        </div>
      </div>
    );
  }

  const cat = getCategory(design.category)!;
  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const goStep = (id: StepId) => {
    setStep(id);
    document.getElementById("panel-pasos")?.scrollTo({ top: 0 });
  };

  const StepView = { estilo: StepStyle, medidas: StepDimensions, madera: StepWood, diseno: StepDesign, detalles: StepDetails }[step];
  const wood = woodOrDefault(design.wood);

  return (
    <div className="cfg">
      <header className="cfg-top">
        <Link href="/" className="logo" aria-label="Kamura Muebles, ir al inicio">
          <span className="logo-mark">Kamura</span>
        </Link>
        <div className="cfg-title">
          <strong>
            Tu {cat.singular}
          </strong>
          <span className="hide-compact">Se guarda automáticamente en este dispositivo</span>
        </div>
        <div className="spacer" />
        <div className="cfg-top-actions">
          <button type="button" className="icon-btn" onClick={undo} disabled={!canUndo} title="Deshacer (Ctrl+Z)" aria-label="Deshacer">
            <Icon name="undo" size={17} />
          </button>
          <button type="button" className="icon-btn" onClick={redo} disabled={!canRedo} title="Rehacer" aria-label="Rehacer">
            <Icon name="redo" size={17} />
          </button>
          <span className="hide-compact">
            <SaveLinkButton design={design} />
          </span>
          <Link href="/disenar/revision" className="btn btn-outline btn-sm hide-compact">
            Ver mi diseño
          </Link>
          <Link href="/disenar/solicitud" className="btn btn-quote btn-sm hide-compact" onClick={() => track("cotizacion_iniciada", { categoria: design.category })}>
            Solicitar cotización
          </Link>
        </div>
      </header>

      <div className="cfg-body" id="contenido">
        <aside className="cfg-left" aria-label="Configuración del mueble">
          <nav className="stepper" aria-label="Pasos">
            {STEPS.map((s, i) => (
              <button key={s.id} type="button" aria-current={s.id === step ? "step" : undefined} className={i < stepIndex ? "done" : ""} onClick={() => goStep(s.id)}>
                <span className="num">{i + 1}</span>
                {s.label}
              </button>
            ))}
          </nav>
          <div className="panel-scroll" id="panel-pasos">
            <StepView design={design} />
          </div>
          <div className="panel-footer">
            {stepIndex > 0 ? (
              <button type="button" className="btn btn-outline" onClick={() => goStep(STEPS[stepIndex - 1].id)}>
                <Icon name="arrowLeft" size={16} /> Anterior
              </button>
            ) : (
              <Link href="/muebles" className="btn btn-outline">
                Elegir mueble
              </Link>
            )}
            {stepIndex < STEPS.length - 1 ? (
              <button type="button" className="btn btn-primary" onClick={() => goStep(STEPS[stepIndex + 1].id)}>
                Siguiente <Icon name="arrowRight" size={16} />
              </button>
            ) : (
              <Link href="/disenar/revision" className="btn btn-primary">
                Ver mi diseño
              </Link>
            )}
          </div>
        </aside>

        <main className="cfg-center" aria-label="Vista 3D">
          <Viewer
            design={design}
            badge={
              <div className="viewer-badge">
                <span className="dot" style={{ backgroundImage: swatch ? `url(${swatch})` : undefined, backgroundColor: wood.texture.base }} />
                {wood.name}
              </div>
            }
          />
        </main>

        <aside className="cfg-right" aria-label="Asistente y resumen">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={rightTab === "asistente"} onClick={() => setRightTab("asistente")}>
              Asistente
            </button>
            <button role="tab" aria-selected={rightTab === "resumen"} onClick={() => setRightTab("resumen")}>
              Resumen
            </button>
          </div>
          {rightTab === "asistente" ? <AssistantPanel design={design} /> : <SummaryPanel design={design} />}
        </aside>
      </div>

      <div className="mobile-bar">
        <button type="button" className="btn btn-outline" onClick={() => setSheet("asistente")}>
          <Icon name="chat" size={17} /> Asistente
        </button>
        <button type="button" className="btn btn-outline" onClick={() => setSheet("resumen")} aria-label="Ver resumen">
          <Icon name="list" size={17} />
        </button>
        <Link href="/disenar/solicitud" className="btn btn-quote" onClick={() => track("cotizacion_iniciada", { categoria: design.category })}>
          Solicitar cotización
        </Link>
      </div>

      {sheet && (
        <>
          <div className="sheet-backdrop" onClick={() => setSheet(null)} />
          <div className="sheet" role="dialog" aria-modal="true" aria-label={sheet === "asistente" ? "Asistente" : "Resumen"}>
            <div className="sheet-head">
              <h2>{sheet === "asistente" ? "Asistente de diseño" : "Tu diseño"}</h2>
              <button type="button" className="icon-btn" onClick={() => setSheet(null)} aria-label="Cerrar">
                <Icon name="close" />
              </button>
            </div>
            {sheet === "asistente" ? (
              <AssistantPanel design={design} />
            ) : (
              <>
                <SummaryPanel design={design} />
                <div style={{ padding: "0 20px 20px" }}>
                  <SaveLinkButton design={design} />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
