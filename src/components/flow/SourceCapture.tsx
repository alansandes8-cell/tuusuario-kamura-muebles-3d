"use client";
import { useEffect } from "react";

export const SOURCE_KEY = "kamura-origen";

/** Guarda el origen de la visita (UTM y sitio de referencia, sin datos personales) para adjuntarlo a la solicitud. */
export function SourceCapture() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(SOURCE_KEY)) return;
      const sp = new URLSearchParams(window.location.search);
      let referrer = "";
      try {
        referrer = document.referrer ? new URL(document.referrer).origin : "";
      } catch {
        referrer = "";
      }
      const source = {
        utm_source: sp.get("utm_source") ?? undefined,
        utm_medium: sp.get("utm_medium") ?? undefined,
        utm_campaign: sp.get("utm_campaign") ?? undefined,
        referrer: referrer && referrer !== window.location.origin ? referrer : undefined,
        landing: window.location.pathname.slice(0, 200),
      };
      sessionStorage.setItem(SOURCE_KEY, JSON.stringify(source));
    } catch {
      // Sin almacenamiento de sesión: no se registra el origen.
    }
  }, []);
  return null;
}

export function readSource(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(SOURCE_KEY) ?? "{}");
  } catch {
    return {};
  }
}
