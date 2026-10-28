/**
 * Geometrías de Three.js para las piezas paramétricas.
 *
 * Las geometrías se construyen a tamaño real (convertido a metros) y sus
 * coordenadas UV se calculan en centímetros reales, para que la veta de la
 * madera conserve su escala en piezas de cualquier tamaño y siga la dirección
 * indicada por la pieza.
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { Axis, Part } from "@/lib/catalog";
import { TEXTURE_WORLD_CM } from "@/lib/woods/texture";

export const CM = 0.01;
const AXES: Axis[] = ["x", "y", "z"];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Recalcula UVs en función de la posición (cm) y la dirección de la veta. */
export function applyWorldUVs(geometry: THREE.BufferGeometry, grain: Axis, seed: string) {
  const pos = geometry.getAttribute("position");
  const normal = geometry.getAttribute("normal");
  const uv = new Float32Array(pos.count * 2);
  const g = AXES.indexOf(grain);
  const h = hash(seed);
  const offU = (h % 97) * 1.37;
  const offV = ((h >> 7) % 89) * 2.11;
  const p = [0, 0, 0];
  const n = [0, 0, 0];
  for (let i = 0; i < pos.count; i++) {
    p[0] = pos.getX(i) / CM;
    p[1] = pos.getY(i) / CM;
    p[2] = pos.getZ(i) / CM;
    n[0] = Math.abs(normal.getX(i));
    n[1] = Math.abs(normal.getY(i));
    n[2] = Math.abs(normal.getZ(i));
    const a = n[0] >= n[1] && n[0] >= n[2] ? 0 : n[1] >= n[2] ? 1 : 2;
    let u: number;
    let v: number;
    if (a !== g) {
      const other = 3 - a - g;
      u = p[other];
      v = p[g];
    } else {
      // Testa (corte transversal): se usa una proyección comprimida.
      const o1 = (a + 1) % 3;
      const o2 = (a + 2) % 3;
      u = p[o1];
      v = p[o2] * 0.2;
    }
    uv[i * 2] = (u + offU) / TEXTURE_WORLD_CM;
    uv[i * 2 + 1] = (v + offV) / TEXTURE_WORLD_CM;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

function roundedRectShape(w: number, d: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -d / 2;
  r = Math.min(r, w / 2, d / 2);
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r);
  s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d);
  s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

/** Crea la geometría de una pieza, centrada en su origen local, en metros. */
export function createPartGeometry(part: Part): THREE.BufferGeometry {
  let geo: THREE.BufferGeometry;
  if (part.kind === "box") {
    const [w, h, d] = part.size.map((v) => v * CM) as [number, number, number];
    const minSide = Math.min(w, h, d);
    if (part.cornerRadius && part.cornerRadius > 0) {
      const bevel = Math.min(0.003, h / 4);
      const shape = roundedRectShape(w - 2 * bevel, d - 2 * bevel, part.cornerRadius * CM);
      const curveSegments = part.cornerRadius * 2 >= Math.min(part.size[0], part.size[2]) - 0.01 ? 48 : 10;
      geo = new THREE.ExtrudeGeometry(shape, {
        depth: h - 2 * bevel,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 2,
        curveSegments,
      });
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, -h / 2 + bevel, 0);
      geo.computeVertexNormals();
    } else if (minSide > 0.008) {
      geo = new RoundedBoxGeometry(w, h, d, 2, Math.min(0.0025, minSide / 4));
    } else {
      geo = new THREE.BoxGeometry(w, h, d);
    }
    applyWorldUVs(geo, part.grain ?? "x", part.id);
  } else {
    geo = new THREE.CylinderGeometry(part.radiusTop * CM, part.radiusBottom * CM, part.height * CM, part.segments, 1);
    if (part.segments <= 6) geo = geo.toNonIndexed();
    geo.computeVertexNormals();
    applyWorldUVs(geo, "y", part.id);
  }
  return geo;
}

/** Clave que identifica una geometría: si no cambia, se reutiliza. */
export function geometryKey(part: Part): string {
  if (part.kind === "box") return `b:${part.size.join(",")}:${part.cornerRadius ?? 0}:${part.grain}:${part.id}`;
  return `c:${part.radiusTop},${part.radiusBottom},${part.height},${part.segments}:${part.id}`;
}
