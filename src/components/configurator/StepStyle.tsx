"use client";
import { useState } from "react";
import { FrontElevation } from "@/components/viewer/FrontElevation";
import { track } from "@/lib/analytics";
import { CATEGORIES, getCategory } from "@/lib/catalog";
import { createDesign, type Design } from "@/lib/design/design";
import { useConfigurator } from "@/lib/store/configurator";

export function StepStyle({ design }: { design: Design }) {
  const cat = getCategory(design.category)!;
  const dispatch = useConfigurator((s) => s.dispatch);
  const start = useConfigurator((s) => s.start);
  const [showCategories, setShowCategories] = useState(false);

  return (
    <div>
      <h2>Elegí un punto de partida</h2>
      <p className="panel-intro">Cada estilo es una base que después podés ajustar a tu gusto: medidas, madera y detalles.</p>
      <div className="choice-grid cols-1" role="radiogroup" aria-label={`Estilos de ${cat.singular}`}>
        {cat.templates.map((t) => {
          const preview = createDesign(cat.id, t.id, design.wood);
          const selected = design.templateId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              className="choice"
              aria-checked={selected}
              onClick={() => {
                if (selected) return;
                const r = dispatch({ type: "applyTemplate", templateId: t.id });
                if (r.ok) track("personalizacion_iniciada", { categoria: cat.id, plantilla: t.id }, { once: true });
              }}
            >
              <div className="preview" aria-hidden="true">
                <FrontElevation design={preview} />
              </div>
              <strong>{t.name}</strong>
              <span>{t.description}</span>
            </button>
          );
        })}
      </div>
      <p className="small muted" style={{ marginTop: 14 }}>
        Al cambiar de estilo se cargan sus medidas y opciones sugeridas. La madera elegida se mantiene, y podés volver
        atrás con «Deshacer».
      </p>

      <h3 className="group-title" style={{ marginTop: 28 }}>
        Tipo de mueble
      </h3>
      <p className="small" style={{ marginBottom: 10 }}>
        Estás diseñando {cat.article === "la" ? "una" : "un"} <strong>{cat.singular}</strong>.{" "}
        <button type="button" className="btn-ghost" style={{ border: 0, padding: 0, color: "var(--wood)", fontWeight: 600, cursor: "pointer", background: "none" }} onClick={() => setShowCategories((v) => !v)} aria-expanded={showCategories}>
          {showCategories ? "Cerrar" : "Cambiar mueble"}
        </button>
      </p>
      {showCategories && (
        <div className="presets" role="list">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              role="listitem"
              className="chip"
              aria-pressed={c.id === cat.id}
              onClick={() => {
                start(c.id);
                track("categoria_seleccionada", { categoria: c.id });
                setShowCategories(false);
              }}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
