"use client";
import { useEffect, useState } from "react";
import type { WoodSpecies } from "@/lib/woods";

/** Genera la muestra de una madera en el cliente (después del primer render). */
export function useWoodSwatch(wood: WoodSpecies | undefined, size = 160): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!wood) return;
    let cancelled = false;
    void import("@/lib/three/woodTextures").then(({ getWoodSwatch }) => {
      if (!cancelled) setUrl(getWoodSwatch(wood, size));
    });
    return () => {
      cancelled = true;
    };
  }, [wood, size]);
  return url;
}
