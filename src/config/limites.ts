/** Límites de archivos y uso, compartidos entre el navegador y el servidor. */
export const UPLOADS = {
  maxFiles: 2,
  /** Tamaño máximo por archivo, ya comprimido en el navegador. */
  maxBytes: 2.5 * 1024 * 1024,
  /** Tamaño máximo del archivo original que se acepta para comprimir. */
  maxOriginalBytes: 20 * 1024 * 1024,
  maxDimension: 1800,
  types: ["image/jpeg", "image/png", "image/webp"],
};

export const RENDERS = {
  maxBytes: 900 * 1024,
};
