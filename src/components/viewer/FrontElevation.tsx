/**
 * Vista frontal en SVG generada desde las mismas piezas del modelo 3D.
 * Se usa como alternativa cuando el dispositivo no puede mostrar 3D y como
 * miniatura de las plantillas.
 */
import { getCategory, type Part } from "@/lib/catalog";
import { boundingBox } from "@/lib/catalog/parts";
import type { Design } from "@/lib/design/design";
import { woodOrDefault } from "@/lib/woods";

interface Props {
  design: Design;
  className?: string;
  title?: string;
  showReference?: boolean;
}

function shapeFor(p: Part): { d: string; z: number } {
  if (p.kind === "box") {
    let [w, h] = p.size;
    if (p.rotation && Math.abs(p.rotation[1]) > 0.01) w = Math.max(w, p.size[2]);
    const x = p.position[0] - w / 2;
    const y = p.position[1] - h / 2;
    return { d: `M${x},${-y}h${w}v${-h}h${-w}z`, z: p.position[2] + p.size[2] / 2 };
  }
  const k = p.segments <= 4 ? Math.SQRT1_2 * Math.SQRT2 : 1;
  const rt = p.radiusTop * k;
  const rb = p.radiusBottom * k;
  const [cx, cy] = p.position;
  const y0 = cy - p.height / 2;
  const y1 = cy + p.height / 2;
  if (p.rotation && Math.abs(p.rotation[0]) > 0.01) {
    // Cilindro mirando al frente (perillas): se dibuja como círculo.
    const r = Math.max(rt, rb);
    return { d: `M${cx - r},${-cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`, z: p.position[2] + p.height / 2 };
  }
  return { d: `M${cx - rb},${-y0}L${cx + rb},${-y0}L${cx + rt},${-y1}L${cx - rt},${-y1}z`, z: p.position[2] + Math.max(rt, rb) };
}

export function FrontElevation({ design, className, title, showReference = false }: Props) {
  const cat = getCategory(design.category)!;
  const parts = cat.build(design).filter((p) => showReference || p.material !== "reference");
  const bb = boundingBox(parts);
  const wood = woodOrDefault(design.wood).texture;
  const pad = Math.max(bb.size[0], bb.size[1]) * 0.06;
  const shapes = parts.map((p) => ({ p, ...shapeFor(p) })).sort((a, b) => a.z - b.z);
  const vb = `${bb.min[0] - pad} ${-bb.max[1] - pad} ${bb.size[0] + 2 * pad} ${bb.size[1] + 2 * pad}`;
  return (
    <svg viewBox={vb} className={className} role="img" aria-label={title ?? `Vista frontal: ${cat.singular}`} preserveAspectRatio="xMidYMid meet">
      <line x1={bb.min[0] - pad} x2={bb.max[0] + pad} y1={0} y2={0} stroke="#cbbfae" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
      {shapes.map(({ p, d }) => {
        const fill =
          p.material === "shadow" ? "#3a2c22" : p.material === "glass" ? "rgba(214,228,230,0.55)" : p.material === "reference" ? "#ece7df" : wood.base;
        return <path key={p.id} d={d} fill={fill} stroke={p.material === "shadow" ? "none" : wood.late} strokeWidth={1} vectorEffect="non-scaling-stroke" />;
      })}
    </svg>
  );
}
