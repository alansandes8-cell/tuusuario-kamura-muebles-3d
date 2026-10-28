"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { UPLOADS } from "@/config/limites";
import { prepareImage } from "@/lib/images";
import { useConfigurator } from "@/lib/store/configurator";

/** Carga opcional de fotos del ambiente o de referencias. Las fotos quedan en memoria hasta enviar la solicitud. */
export function AttachmentPicker() {
  const files = useConfigurator((s) => s.attachments);
  const setFiles = useConfigurator((s) => s.setAttachments);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const urls = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files]);
  useEffect(() => () => urls.forEach((u) => URL.revokeObjectURL(u)), [urls]);

  const onPick = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    setBusy(true);
    const next = [...files];
    for (const f of Array.from(list)) {
      if (next.length >= UPLOADS.maxFiles) {
        setError(`Podés adjuntar hasta ${UPLOADS.maxFiles} fotos.`);
        break;
      }
      const r = await prepareImage(f);
      if (r.ok) next.push(r.file);
      else setError(r.error);
    }
    setFiles(next);
    setBusy(false);
    if (input.current) input.current.value = "";
  };

  return (
    <div className="upload">
      <p className="small" style={{ margin: 0 }}>
        <strong>Foto del ambiente o referencia (opcional).</strong> Nos ayuda a entender dónde va el mueble. Hasta{" "}
        {UPLOADS.maxFiles} fotos JPG, PNG o WebP.
      </p>
      <div className="upload-list">
        {files.map((f, i) => (
          <div className="upload-item" key={`${f.name}-${i}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urls[i]} alt={`Foto adjunta ${i + 1}`} />
            <button type="button" aria-label={`Quitar ${f.name}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}>
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
        {files.length < UPLOADS.maxFiles && (
          <label className="btn btn-outline btn-sm" style={{ alignSelf: "center" }}>
            {busy ? <span className="spinner" /> : <Icon name="image" size={16} />}
            {busy ? "Procesando…" : "Agregar foto"}
            <input ref={input} type="file" accept={UPLOADS.types.join(",")} multiple className="visually-hidden" onChange={(e) => onPick(e.target.files)} disabled={busy} />
          </label>
        )}
      </div>
      {error && (
        <p className="field-error" role="alert" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  );
}
