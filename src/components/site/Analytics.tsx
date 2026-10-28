"use client";
/**
 * Carga de herramientas de medición (GTM, GA4, Meta Pixel) solo si están
 * configuradas por variables de entorno y la persona dio su consentimiento.
 */
import Script from "next/script";
import { useEffect, useState } from "react";
import { analyticsConfigured, CONSENT_KEY } from "@/lib/analytics";

const GTM = process.env.NEXT_PUBLIC_GTM_ID;
const GA4 = process.env.NEXT_PUBLIC_GA4_ID;
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID;

export function Analytics() {
  const [consent, setConsent] = useState<"si" | "no" | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(CONSENT_KEY);
      if (v === "si" || v === "no") setConsent(v);
    } catch {
      // Sin almacenamiento disponible: se pregunta en cada visita.
    }
    setReady(true);
  }, []);

  if (!analyticsConfigured() || !ready) return null;

  const decide = (v: "si" | "no") => {
    try {
      localStorage.setItem(CONSENT_KEY, v);
    } catch {
      // ignorado
    }
    setConsent(v);
  };

  if (consent === null) {
    return (
      <div className="modal" style={{ alignItems: "end", background: "transparent", pointerEvents: "none" }}>
        <div className="modal-card" style={{ pointerEvents: "auto", width: "min(560px, 100%)" }} role="dialog" aria-label="Medición del sitio">
          <p className="small" style={{ margin: "0 0 12px" }}>
            Usamos herramientas de medición para entender cómo se usa el configurador y mejorarlo. No registramos tus
            datos de contacto en estas mediciones. <a href="/privacidad">Más información</a>.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-outline btn-sm" onClick={() => decide("no")}>
              Rechazar
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => decide("si")}>
              Aceptar
            </button>
          </div>
        </div>
      </div>
    );
  }
  if (consent !== "si") return null;

  return (
    <>
      {GTM && (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(GTM)});`}
        </Script>
      )}
      {GA4 && !GTM && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4)}`} strategy="afterInteractive" />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config',${JSON.stringify(GA4)},{anonymize_ip:true});`}
          </Script>
        </>
      )}
      {PIXEL && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(PIXEL)});fbq('track','PageView');`}
        </Script>
      )}
    </>
  );
}
