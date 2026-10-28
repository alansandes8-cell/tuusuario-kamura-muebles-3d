"use client";
import Link from "next/link";
import type { Design } from "@/lib/design/design";
import { summarizeDesign } from "@/lib/design/summary";
import { validateDesign } from "@/lib/design/validation";
import { useConfigurator, type StepId } from "@/lib/store/configurator";

export function SummaryList({ design, onEdit }: { design: Design; onEdit?: (step: StepId) => void }) {
  const s = summarizeDesign(design);
  const edit = (step: StepId) =>
    onEdit ? (
      <button type="button" onClick={() => onEdit(step)}>
        Cambiar
      </button>
    ) : null;
  return (
    <div className="summary-section">
      <h3>Mueble {edit("estilo")}</h3>
      <dl className="summary-list">
        <dt>Tipo</dt>
        <dd>{s.category}</dd>
        <dt>Estilo de partida</dt>
        <dd>{s.template}</dd>
      </dl>
      <h3>Medidas {edit("medidas")}</h3>
      <dl className="summary-list">
        {s.dimensions.map((l) => (
          <div key={l.label} style={{ display: "contents" }}>
            <dt>{l.label}</dt>
            <dd>{l.value}</dd>
          </div>
        ))}
        <dt>Exterior aprox.</dt>
        <dd>
          {s.overall.ancho} × {s.overall.profundidad} × {s.overall.alto} cm
        </dd>
      </dl>
      <h3>Madera {edit("madera")}</h3>
      <dl className="summary-list">
        <dt>Especie</dt>
        <dd>{s.wood}</dd>
      </dl>
      <h3>Diseño {edit("diseno")}</h3>
      <dl className="summary-list">
        {s.options.map((l) => (
          <div key={l.label} style={{ display: "contents" }}>
            <dt>{l.label}</dt>
            <dd>{l.value}</dd>
          </div>
        ))}
      </dl>
      {s.details.length > 0 && (
        <>
          <h3>Detalles {edit("detalles")}</h3>
          {s.details.map((l) => (
            <p key={l.label} className="small" style={{ margin: "0 0 8px" }}>
              <span className="muted">{l.label}: </span>
              {l.value}
            </p>
          ))}
        </>
      )}
    </div>
  );
}

export function ValidationNotices({ design }: { design: Design }) {
  const v = validateDesign(design);
  if (!v.errors.length && !v.warnings.length) return null;
  return (
    <div aria-live="polite">
      {v.errors.map((e) => (
        <p key={e.message} className="notice notice-error">
          {e.message}
        </p>
      ))}
      {v.warnings.map((w) => (
        <p key={w.message} className="notice notice-warn">
          {w.message}
        </p>
      ))}
    </div>
  );
}

export function SummaryPanel({ design }: { design: Design }) {
  const setStep = useConfigurator((s) => s.setStep);
  return (
    <div className="panel-scroll">
      <h2 style={{ fontSize: "1.25rem" }}>Tu diseño</h2>
      <ValidationNotices design={design} />
      <SummaryList design={design} onEdit={setStep} />
      <div style={{ display: "grid", gap: 8, marginTop: 20 }}>
        <Link href="/disenar/revision" className="btn btn-outline btn-block">
          Ver mi diseño
        </Link>
        <Link href="/disenar/solicitud" className="btn btn-quote btn-block">
          Solicitar cotización
        </Link>
      </div>
      <p className="small muted" style={{ marginTop: 12 }}>
        No mostramos precios: el equipo de Kamura revisa cada diseño y prepara una cotización personalizada.
      </p>
    </div>
  );
}
