/**
 * Generador procedural de texturas de madera.
 *
 * Produce imágenes continuas (se repiten sin cortes) con anillos ondulados,
 * fibras, poros, vetas oscuras y variaciones de tono. Es una función pura que
 * escribe píxeles RGBA, así que funciona en el navegador y en pruebas.
 *
 * Convención: la veta corre a lo largo del eje vertical de la imagen (v).
 * Una textura completa representa TEXTURE_WORLD_CM centímetros.
 */
import type { WoodTextureParams } from "@/config/maderas";

export const TEXTURE_WORLD_CM = 100;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Ruido de valor 2D periódico (px, py en celdas) para lograr continuidad. */
function makeNoise(seed: number) {
  const hash = (x: number, y: number) => {
    let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  };
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number, px: number, py: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const x0 = ((xi % px) + px) % px;
    const y0 = ((yi % py) + py) % py;
    const x1 = (x0 + 1) % px;
    const y1 = (y0 + 1) % py;
    const u = fade(xf);
    const v = fade(yf);
    const a = hash(x0, y0);
    const b = hash(x1, y0);
    const c = hash(x0, y1);
    const d = hash(x1, y1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

export interface WoodImage {
  width: number;
  height: number;
  /** RGBA del color. */
  color: Uint8ClampedArray;
  /** RGBA en escala de grises para relieve (bump). */
  bump: Uint8ClampedArray;
}

export function generateWoodPixels(params: WoodTextureParams, size: number, seedKey: string): WoodImage {
  const noise = makeNoise(hashSeed(seedKey));
  const base = hexToRgb(params.base);
  const late = hexToRgb(params.late);
  const streak = hexToRgb(params.streak);
  const color = new Uint8ClampedArray(size * size * 4);
  const bump = new Uint8ClampedArray(size * size * 4);

  const fbm = (x: number, y: number, px: number, py: number, oct: number) => {
    let sum = 0;
    let amp = 0.5;
    let f = 1;
    for (let o = 0; o < oct; o++) {
      sum += amp * noise(x * f, y * f, px * f, py * f);
      amp *= 0.5;
      f *= 2;
    }
    return sum;
  };

  for (let j = 0; j < size; j++) {
    const v = j / size;
    for (let i = 0; i < size; i++) {
      const u = i / size;
      // Ondulación de la veta: desplaza los anillos lateralmente.
      const w = fbm(u * 4, v * 3, 4, 3, 3) - 0.5;
      const ringPos = u * params.rings + w * params.warp * 3.2 + (fbm(u * 2, v * 8, 2, 8, 2) - 0.5) * 0.35;
      const r = ringPos - Math.floor(ringPos);
      // Madera tardía: banda más oscura y nítida en cada anillo.
      const lateBand = Math.pow(Math.max(0, Math.sin(r * Math.PI)), 6) * 0.6 + smooth(0.78, 0.98, r) * 0.7;
      const ring = Math.min(1, lateBand) * params.ringContrast;

      // Fibras finas, estiradas a lo largo de la veta.
      const fib = noise(u * 260, v * 6, 260, 6) - 0.5;
      // Poros: guiones cortos oscuros.
      const pore = smooth(0.82, 0.95, noise(u * 420, v * 38, 420, 38)) * 0.6;
      // Vetas oscuras amplias y variación tonal.
      const st = smooth(0.6, 0.78, fbm(u * 7 + w * 0.6, v * 0.999 + 0.3, 7, 1, 3)) * params.streakAmount;
      const tone = (fbm(u * 2, v * 2, 2, 2, 2) - 0.5) * params.tone;

      let R = base[0] + (late[0] - base[0]) * ring;
      let G = base[1] + (late[1] - base[1]) * ring;
      let B = base[2] + (late[2] - base[2]) * ring;
      R += (streak[0] - R) * st;
      G += (streak[1] - G) * st;
      B += (streak[2] - B) * st;
      const shade = 1 + tone * 0.6 + fib * params.fiber * 0.22 - pore * 0.18;
      const idx = (j * size + i) * 4;
      color[idx] = R * shade;
      color[idx + 1] = G * shade;
      color[idx + 2] = B * shade;
      color[idx + 3] = 255;
      const b = 128 + (fib * params.fiber * 0.6 - ring * 0.5 - pore) * 110;
      bump[idx] = bump[idx + 1] = bump[idx + 2] = b;
      bump[idx + 3] = 255;
    }
  }
  return { width: size, height: size, color, bump };
}

function smooth(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
