"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Viewer } from "@/components/viewer/Viewer";
import type { ViewerHandle } from "@/components/viewer/types";
import { getCategory } from "@/lib/catalog";
import type { Design } from "@/lib/design/design";
import { hydrateConfigurator, useConfigurator } from "@/lib/store/configurator";

/** Visor 3D del diseño recibido, reconstruido desde los datos estructurados. */
export function AdminDesignViewer({ design, code }: { design: Design; code: string }) {
  const router = useRouter();
  const ref = useRef<ViewerHandle | null>(null);
  const [err, setErr] = useState("");
  const download = (view: "perspectiva" | "frente" | "lateral") => {
    const url = ref.current?.capture(view, 1600, 1200);
    if (!url) {
      setErr("No se pudo generar la imagen en este dispositivo.");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = `${code}-${view}.jpg`;
    a.click();
  };
  const openInConfigurator = () => {
    hydrateConfigurator();
    const unsub = useConfigurator.subscribe((s) => {
      if (s.hydrated) finish();
    });
    const finish = () => {
      unsub();
      useConfigurator.getState().loadDesign(design);
      router.push(`/disenar/${getCategory(design.category)!.slug}`);
    };
    if (useConfigurator.getState().hydrated) finish();
  };
  return (
    <>
      <div className="detail-viewer">
        <Viewer design={design} handleRef={ref} hint={false} initialDimensions />
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => download("perspectiva")}>
          <Icon name="download" size={16} /> Imagen en perspectiva
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => download("frente")}>
          <Icon name="download" size={16} /> Imagen de frente
        </button>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => download("lateral")}>
          <Icon name="download" size={16} /> Imagen lateral
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={openInConfigurator} title="Carga este diseño en el configurador de este navegador">
          <Icon name="external" size={16} /> Abrir en el configurador
        </button>
      </div>
      {err && <p className="field-error">{err}</p>}
    </>
  );
}
