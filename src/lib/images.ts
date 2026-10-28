"use client";
import { UPLOADS } from "@/config/limites";

/**
 * Reduce una foto en el navegador antes de enviarla (máx. 1800 px, JPEG).
 * Devuelve un error legible si el archivo no es una imagen admitida.
 */
export async function prepareImage(file: File): Promise<{ ok: true; file: File } | { ok: false; error: string }> {
  if (!UPLOADS.types.includes(file.type)) {
    return { ok: false, error: `«${file.name}» no es una imagen JPG, PNG o WebP.` };
  }
  if (file.size > UPLOADS.maxOriginalBytes) {
    return { ok: false, error: `«${file.name}» es demasiado pesada (máximo 20 MB).` };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, UPLOADS.maxDimension / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.82));
    if (!blob) throw new Error("toBlob");
    if (blob.size > UPLOADS.maxBytes) return { ok: false, error: `«${file.name}» sigue siendo muy pesada después de reducirla.` };
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return { ok: true, file: new File([blob], name, { type: "image/jpeg" }) };
  } catch {
    return { ok: false, error: `No pudimos leer «${file.name}». Probá con otra foto.` };
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mime = /data:([^;]+)/.exec(head)?.[1] ?? "image/jpeg";
  const bin = atob(body);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
