"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { OptionSpec } from "@/lib/catalog";
import type { Design } from "@/lib/design/design";
import { visibleOptions } from "@/lib/design/visibility";
import { useConfigurator } from "@/lib/store/configurator";

function OptionControl({ spec, design, onError }: { spec: OptionSpec; design: Design; onError: (key: string, msg: string | null) => void }) {
  const dispatch = useConfigurator((s) => s.dispatch);
  const value = design.options[spec.key];
  const set = (v: string | number | boolean) => {
    const r = dispatch({ type: "setOption", key: spec.key, value: v });
    onError(spec.key, r.ok ? null : r.error);
  };

  if (spec.type === "toggle") {
    return (
      <div className="toggle-row">
        <div className="info">
          <strong id={`opt-${spec.key}`}>{spec.label}</strong>
          {spec.help && <span>{spec.help}</span>}
        </div>
        <button type="button" role="switch" className="switch" aria-checked={Boolean(value)} aria-labelledby={`opt-${spec.key}`} onClick={() => set(!value)} />
      </div>
    );
  }
  if (spec.type === "count") {
    const n = Number(value);
    return (
      <div className="counter-row">
        <div className="info">
          <strong id={`opt-${spec.key}`}>{spec.label}</strong>
          {spec.help && <span>{spec.help}</span>}
        </div>
        <div className="counter" role="group" aria-labelledby={`opt-${spec.key}`}>
          <button type="button" className="icon-btn" onClick={() => set(n - 1)} disabled={n <= spec.min} aria-label={`Menos ${spec.unit[1]}`}>
            <Icon name="minus" size={16} />
          </button>
          <output aria-live="polite">{n}</output>
          <button type="button" className="icon-btn" onClick={() => set(n + 1)} disabled={n >= spec.max} aria-label={`Más ${spec.unit[1]}`}>
            <Icon name="plus" size={16} />
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="option-block">
      <span className="label" id={`opt-${spec.key}`}>
        {spec.label}
      </span>
      <div className={`choice-grid ${spec.choices.length === 3 ? "cols-3" : ""}`} role="radiogroup" aria-labelledby={`opt-${spec.key}`}>
        {spec.choices.map((c) => (
          <button key={c.value} type="button" role="radio" className="choice" aria-checked={value === c.value} onClick={() => set(c.value)} title={c.description}>
            <strong>{c.label}</strong>
            {c.description && spec.choices.length !== 3 && <span>{c.description}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StepDesign({ design }: { design: Design }) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const options = visibleOptions(design);
  const groups = new Map<string, OptionSpec[]>();
  for (const o of options) {
    const g = o.group ?? "Opciones";
    groups.set(g, [...(groups.get(g) ?? []), o]);
  }
  const onError = (key: string, msg: string | null) =>
    setErrors((e) => {
      const next = { ...e };
      if (msg) next[key] = msg;
      else delete next[key];
      return next;
    });

  return (
    <div>
      <h2>Diseño y distribución</h2>
      <p className="panel-intro">Solo te mostramos las opciones que tienen sentido para este mueble.</p>
      {[...groups.entries()].map(([group, specs]) => (
        <section key={group} aria-label={group}>
          <h3 className="group-title">{group}</h3>
          {specs.map((spec) => (
            <div key={spec.key}>
              <OptionControl spec={spec} design={design} onError={onError} />
              {errors[spec.key] && (
                <p className="notice notice-error" role="alert">
                  {errors[spec.key]}
                </p>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
