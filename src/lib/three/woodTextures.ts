"use client";
/**
 * Texturas de madera para el navegador, con caché por especie y liberación de
 * memoria. La generación se hace bajo demanda: solo se crea la textura de la
 * madera elegida.
 */
import * as THREE from "three";
import { woodOrDefault, type WoodSpecies } from "@/lib/woods";
import { generateWoodPixels } from "@/lib/woods/texture";

export interface WoodMaps {
  map: THREE.Texture;
  bumpMap: THREE.Texture;
  roughness: number;
}

const cache = new Map<string, WoodMaps>();

function toCanvas(data: Uint8ClampedArray, size: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(new ImageData(data as unknown as Uint8ClampedArray<ArrayBuffer>, size, size), 0, 0);
  return canvas;
}

export function textureSize(): number {
  if (typeof window === "undefined") return 512;
  const small = window.matchMedia?.("(max-width: 768px)").matches;
  return small ? 512 : 1024;
}

export function getWoodMaps(woodId: string, anisotropy = 4): WoodMaps {
  const wood = woodOrDefault(woodId);
  const cached = cache.get(wood.id);
  if (cached) return cached;
  const size = textureSize();
  const img = generateWoodPixels(wood.texture, size, wood.id);
  const map = new THREE.CanvasTexture(toCanvas(img.color, size));
  map.colorSpace = THREE.SRGBColorSpace;
  const bumpMap = new THREE.CanvasTexture(toCanvas(img.bump, size));
  for (const t of [map, bumpMap]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = anisotropy;
    t.needsUpdate = true;
  }
  const maps = { map, bumpMap, roughness: wood.texture.roughness };
  cache.set(wood.id, maps);
  // Se conservan como máximo 3 especies en memoria de la placa de video.
  if (cache.size > 3) {
    const [oldest] = cache.keys();
    if (oldest !== wood.id) {
      const old = cache.get(oldest)!;
      old.map.dispose();
      old.bumpMap.dispose();
      cache.delete(oldest);
    }
  }
  return maps;
}

const swatchCache = new Map<string, string>();

/** Muestra (data URL) para las tarjetas de selección de madera. */
export function getWoodSwatch(wood: WoodSpecies, size = 160): string {
  const key = `${wood.id}:${size}`;
  const cached = swatchCache.get(key);
  if (cached) return cached;
  // Se genera más grande y se recorta para mostrar la veta a una escala realista.
  const img = generateWoodPixels(wood.texture, size * 2, wood.id);
  const full = toCanvas(img.color, size * 2);
  const out = document.createElement("canvas");
  out.width = out.height = size;
  out.getContext("2d")!.drawImage(full, 0, 0, size, size, 0, 0, size, size);
  const url = out.toDataURL("image/jpeg", 0.85);
  swatchCache.set(key, url);
  return url;
}
