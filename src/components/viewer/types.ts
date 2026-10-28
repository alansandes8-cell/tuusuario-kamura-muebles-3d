export type ViewName = "perspectiva" | "frente" | "lateral";

export interface ViewerHandle {
  /** Renderiza una imagen JPEG (data URL) desde una vista estándar. */
  capture: (view: ViewName, width?: number, height?: number) => string | null;
  setView: (view: ViewName) => void;
}

/** Fondo del visor (coincide con --canvas en globals.css). */
export const VIEWER_BG = "#efe9e1";
