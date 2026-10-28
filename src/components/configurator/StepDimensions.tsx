"use client";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { track } from "@/lib/analytics";
import type { DimensionSpec } from "@/lib/catalog";
import type { Design } from "@/lib/design/design";
import { summarizeDesign } from "@/lib/design/summary";
import { validateDesign } from "@/lib/design/validation";
import { formatCm, visibleDimensions } from "@/lib/design/visibility";
import { useConfigurator } from "@/lib/store/configurator";

function DimensionControl({ spec, design }: { spec: DimensionSpec; design: Design }) {
  const dispatch = useConfigurator((s) => s.dispatch);
  const value = design.dimensions[spec.key];
  const [text, setText] = useState(String(value));
  const [error, setError] = useState<string | null>(null);
  const id = `dim-${spec.key}`;

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const apply = (n: number) => {
    const r = dispatch({ type: "setDimension", key: spec.key, value: n });
    if (r.ok) {
      setError(null);
      track("medidas_modificadas", { categoria: design.category }, { once: true });
    } else setError(r.error);
    return r.ok;
  };

  const commitText = () => {
    const n = Number(text.replace(",", ".").trim());
    if (text.trim() === "" || !Number.isFinite(n)) {
      setError("Ingresá un número en centímetros.");
      return;
    }
    if (n === value) {
      setError(null);
      return;
    }
    apply(n);
  };

  const warnings = validateDesign(design).warnings.filter((w) => w.field === spec.key);

  return (
    <div className="dim">
      <div className="dim-head">
        <label htmlFor={id}>{spec.label}</label>
        <div className="dim-input" data-invalid={Boolean(error)}>
          <input
            id={id}
            inputMode="decimal"
            value={text}
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-msg ${id}-hint`}
            onChange={(e) => setText(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitText();
            }}
          />
          <span className="unit">cm</span>
        </div>
      </div>
      <input
        type="range"
        className="range"
        min={spec.min}
        max={spec.max}
        step={spec.step}
        value={Math.min(spec.max, Math.max(spec.min, value))}
        aria-label={`${spec.label} en centímetros`}
        onChange={(e) => apply(Number(e.target.value))}
      />
      <div className="range-limits" aria-hidden="true">
        <span>{formatCm(spec.min)}</span>
        <span>{formatCm(spec.max)}</span>
      </div>
      {spec.presets && (
        <div className="presets" aria-label={`Medidas frecuentes para ${spec.label.toLowerCase()}`}>
          {spec.presets.map((p) => (
            <button key={p.label} type="button" className="chip" aria-pressed={value === p.value} onClick={() => apply(p.value)}>
              {p.label}
              {!p.label.includes("cm") && <span className="muted"> · {p.value}</span>}
            </button>
          ))}
        </div>
      )}
      {spec.help && (
        <p className="hint" id={`${id}-hint`}>
          {spec.help}
        </p>
      )}
      <div id={`${id}-msg`} aria-live="polite">
        {error && <p className="msg error">{error}</p>}
        {!error && warnings.map((w) => <p key={w.message} className="msg warn">{w.message}</p>)}
      </div>
    </div>
  );
}

export function StepDimensions({ design }: { design: Design }) {
  const dispatch = useConfigurator((s) => s.dispatch);
  const overall = summarizeDesign(design).overall;
  return (
    <div>
      <h2>Medidas</h2>
      <p className="panel-intro">Todas las medidas son en centímetros. El modelo se actualiza a escala mientras las cambiás.</p>
      {visibleDimensions(design).map((spec) => (
        <DimensionControl key={`${design.category}-${spec.key}`} spec={spec} design={design} />
      ))}
      <div className="overall" aria-label="Medidas exteriores aproximadas">
        <div>
          <b>{overall.ancho}</b>
          <small>Ancho</small>
        </div>
        <div>
          <b>{overall.profundidad}</b>
          <small>Prof.</small>
        </div>
        <div>
          <b>{overall.alto}</b>
          <small>Alto</small>
        </div>
      </div>
      <p className="small muted">
        Medidas exteriores aproximadas en cm. Son orientativas: el equipo de Kamura confirma la viabilidad de cada proyecto
        antes de fabricarlo.
      </p>
      <button type="button" className="btn btn-outline btn-sm" onClick={() => dispatch({ type: "resetDimensions" })}>
        <Icon name="reset" size={16} />
        Restaurar medidas sugeridas
      </button>
    </div>
  );
}
