"use client";
import { useWoodSwatch } from "@/components/configurator/useWoodSwatch";
import { WOODS, type WoodSpecies } from "@/lib/woods";

function Item({ wood }: { wood: WoodSpecies }) {
  const swatch = useWoodSwatch(wood, 200);
  return (
    <figure>
      <div className="swatch" style={{ backgroundImage: swatch ? `url(${swatch})` : undefined, backgroundColor: wood.texture.base }} role="img" aria-label={`Muestra digital de ${wood.name}`} />
      <figcaption>{wood.name}</figcaption>
    </figure>
  );
}

export function WoodStrip() {
  return (
    <div className="wood-strip">
      {WOODS.map((w) => (
        <Item key={w.id} wood={w} />
      ))}
    </div>
  );
}
