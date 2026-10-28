"use client";
/**
 * Eventos de medición. Se envían solo si hay una herramienta configurada
 * (GTM, GA4 o Meta Pixel) y la persona aceptó la medición.
 * Nunca se envían datos personales: solo categoría, madera y acciones.
 */
export type AnalyticsEvent =
  | "configurador_visita"
  | "categoria_seleccionada"
  | "personalizacion_iniciada"
  | "madera_cambiada"
  | "medidas_modificadas"
  | "asistente_usado"
  | "cotizacion_iniciada"
  | "cotizacion_enviada";

type Props = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

export const CONSENT_KEY = "kamura-medicion";

export function analyticsConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GTM_ID || process.env.NEXT_PUBLIC_GA4_ID || process.env.NEXT_PUBLIC_META_PIXEL_ID);
}

export function hasConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "si";
  } catch {
    return false;
  }
}

const sentOnce = new Set<string>();

export function track(event: AnalyticsEvent, props: Props = {}, options: { once?: boolean } = {}) {
  if (typeof window === "undefined" || !analyticsConfigured() || !hasConsent()) return;
  if (options.once) {
    const key = `${event}:${JSON.stringify(props)}`;
    if (sentOnce.has(key)) return;
    sentOnce.add(key);
  }
  try {
    window.dataLayer?.push({ event, ...props });
    window.gtag?.("event", event, props);
    if (event === "cotizacion_enviada") window.fbq?.("track", "Lead", { content_category: props.categoria });
    else window.fbq?.("trackCustom", event, props);
  } catch {
    // La medición nunca debe interrumpir la experiencia.
  }
}
