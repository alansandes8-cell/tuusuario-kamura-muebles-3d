"use client";
import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { Icon } from "@/components/ui/Icon";
import type { Design } from "@/lib/design/design";
import { FrontElevation } from "./FrontElevation";
import type { ViewerHandle, ViewName } from "./types";

const Scene = dynamic(() => import("./Scene"), {
  ssr: false,
  loading: () => <ViewerLoading />,
});

function ViewerLoading() {
  return (
    <div className="viewer-loading" role="status">
      <div style={{ display: "grid", justifyItems: "center", gap: 10 }}>
        <span className="spinner" />
        Preparando la vista 3D…
      </div>
    </div>
  );
}

class SceneBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function detectWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

interface ViewerProps {
  design: Design;
  handleRef?: RefObject<ViewerHandle | null>;
  /** Muestra la barra de vistas y medidas. */
  toolbar?: boolean;
  hint?: boolean;
  className?: string;
  badge?: ReactNode;
  initialDimensions?: boolean;
}

export function Viewer({ design, handleRef, toolbar = true, hint = true, className, badge, initialDimensions = false }: ViewerProps) {
  const [support, setSupport] = useState<"checking" | "ok" | "none">("checking");
  const [failed, setFailed] = useState(false);
  const [showDims, setShowDims] = useState(initialDimensions);
  const [view, setView] = useState<ViewName>("perspectiva");
  const [interacted, setInteracted] = useState(false);
  const localRef = useRef<ViewerHandle | null>(null);
  const ref = handleRef ?? localRef;

  useEffect(() => {
    setSupport(detectWebGL() ? "ok" : "none");
  }, []);

  const go = (v: ViewName) => {
    setView(v);
    ref.current?.setView(v);
  };

  const fallback = support === "none" || failed;

  return (
    <div className={`viewer ${className ?? ""}`} onPointerDown={() => setInteracted(true)}>
      {support === "checking" && <ViewerLoading />}
      {support === "ok" && !failed && (
        <SceneBoundary onError={() => setFailed(true)}>
          <Scene design={design} showDimensions={showDims} handleRef={ref} onContextLost={() => setFailed(true)} />
        </SceneBoundary>
      )}
      {fallback && (
        <div className="viewer-fallback">
          <FrontElevation design={design} />
          <div>
            <p className="small" style={{ maxWidth: 420, margin: "0 auto 8px" }}>
              Tu dispositivo no puede mostrar la vista 3D en este momento. Te mostramos una vista frontal generada con las
              mismas medidas; podés seguir diseñando y enviar tu solicitud igual.
            </p>
            {support === "ok" && (
              <button className="btn btn-outline btn-sm" onClick={() => setFailed(false)}>
                Reintentar 3D
              </button>
            )}
          </div>
        </div>
      )}
      {badge}
      {hint && !fallback && !interacted && support === "ok" && (
        <div className="viewer-hint">Arrastrá para girar · rueda o pellizco para acercar</div>
      )}
      {toolbar && !fallback && support === "ok" && (
        <div className="viewer-toolbar" role="toolbar" aria-label="Controles de la vista 3D">
          <button aria-pressed={view === "perspectiva"} onClick={() => go("perspectiva")} title="Vista en perspectiva">
            <Icon name="cube" size={16} />
            <span className="label-optional">Perspectiva</span>
          </button>
          <button aria-pressed={view === "frente"} onClick={() => go("frente")} title="Vista de frente">
            <Icon name="front" size={16} />
            <span className="label-optional">Frente</span>
          </button>
          <button aria-pressed={view === "lateral"} onClick={() => go("lateral")} title="Vista lateral">
            <Icon name="side" size={16} />
            <span className="label-optional">Lateral</span>
          </button>
          <span className="sep" />
          <button aria-pressed={showDims} onClick={() => setShowDims((v) => !v)} title="Mostrar medidas">
            <Icon name="ruler" size={16} />
            <span className="label-optional">Medidas</span>
          </button>
          <button onClick={() => go("perspectiva")} title="Restablecer la vista inicial" aria-label="Restablecer la vista">
            <Icon name="reset" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
