"use client";
import { useEffect } from "react";
import { hydrateConfigurator, useActiveDesign, useConfigurator } from "@/lib/store/configurator";

/** Diseño activo para las pantallas de revisión y solicitud. */
export function useFlowDesign() {
  const hydrated = useConfigurator((s) => s.hydrated);
  const design = useActiveDesign();
  useEffect(() => {
    hydrateConfigurator();
  }, []);
  return { hydrated, design };
}
