"use client";
import { track } from "@/lib/analytics";
import type { Design } from "@/lib/design/design";
import { WOOD_DISCLAIMER, WOODS, type WoodSpecies } from "@/lib/woods";
import { useConfigurator } from "@/lib/store/configurator";
import { useWoodSwatch } from "./useWoodSwatch";

function WoodCard({ wood, selected, onSelect }: { wood: WoodSpecies; selected: boolean; onSelect: () => void }) {
  const swatch = useWoodSwatch(wood);
  return (
    <button type="button" role="radio" aria-checked={selected} className="choice wood-card" onClick={onSelect}>
      <div className="swatch" style={{ backgroundImage: swatch ? `url(${swatch})` : undefined, backgroundColor: wood.texture.base }} aria-hidden="true" />
      <strong>{wood.name}</strong>
      <span>{wood.description}</span>
    </button>
  );
}

export function StepWood({ design }: { design: Design }) {
  const dispatch = useConfigurator((s) => s.dispatch);
  return (
    <div>
      <h2>Madera</h2>
      <p className="panel-intro">Elegí la especie. El cambio se ve al instante en todo el mueble.</p>
      <div className="choice-grid" role="radiogroup" aria-label="Maderas disponibles">
        {WOODS.map((w) => (
          <WoodCard
            key={w.id}
            wood={w}
            selected={design.wood === w.id}
            onSelect={() => {
              const r = dispatch({ type: "setWood", wood: w.id });
              if (r.ok) track("madera_cambiada", { categoria: design.category, madera: w.id });
            }}
          />
        ))}
      </div>
      <p className="notice notice-info" style={{ marginTop: 16 }}>
        {WOOD_DISCLAIMER}
      </p>
    </div>
  );
}
