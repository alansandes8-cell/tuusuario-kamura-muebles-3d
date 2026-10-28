/**
 * MEDIDAS CONFIGURABLES POR CATEGORÍA (en centímetros)
 *
 * Estos valores son ORIENTATIVOS y deben ser ajustados por Kamura según su
 * capacidad real de fabricación. No representan límites técnicos validados.
 *
 * - default: medida sugerida al empezar.
 * - min / max: rango que el configurador permite elegir.
 * - reviewBelow / reviewAbove: fuera de este rango la solicitud se marca
 *   "requiere revisión del equipo", pero el cliente puede enviarla igual.
 */
export interface MedidaConfig {
  default: number;
  min: number;
  max: number;
  step?: number;
  reviewBelow?: number;
  reviewAbove?: number;
}

export const MEDIDAS = {
  mesa: {
    largo: { default: 180, min: 80, max: 320, reviewAbove: 260 },
    ancho: { default: 90, min: 60, max: 140, reviewAbove: 120 },
    alto: { default: 76, min: 60, max: 110, reviewBelow: 70, reviewAbove: 82 },
  },
  cama: {
    colchonAncho: { default: 140, min: 80, max: 200, reviewAbove: 180 },
    colchonLargo: { default: 190, min: 180, max: 210 },
    altoBase: { default: 30, min: 15, max: 50 },
    altoRespaldo: { default: 100, min: 70, max: 140, reviewAbove: 125 },
  },
  rack: {
    ancho: { default: 180, min: 80, max: 300, reviewAbove: 240 },
    alto: { default: 50, min: 30, max: 80 },
    profundidad: { default: 40, min: 30, max: 60, reviewAbove: 55 },
    altoPatas: { default: 14, min: 8, max: 25 },
  },
  escritorio: {
    ancho: { default: 120, min: 70, max: 220, reviewAbove: 180 },
    profundidad: { default: 60, min: 40, max: 90 },
    alto: { default: 75, min: 65, max: 110, reviewAbove: 80 },
  },
  biblioteca: {
    ancho: { default: 120, min: 40, max: 300, reviewAbove: 240 },
    alto: { default: 200, min: 60, max: 260, reviewAbove: 230 },
    profundidad: { default: 32, min: 20, max: 50 },
  },
  ratona: {
    largo: { default: 110, min: 50, max: 180 },
    ancho: { default: 60, min: 40, max: 120 },
    diametro: { default: 80, min: 50, max: 130, reviewAbove: 110 },
    alto: { default: 40, min: 25, max: 55 },
  },
  barra: {
    largo: { default: 160, min: 80, max: 300, reviewAbove: 240 },
    profundidad: { default: 60, min: 40, max: 120 },
    alto: { default: 105, min: 75, max: 115, reviewAbove: 110 },
  },
  vajillero: {
    ancho: { default: 160, min: 80, max: 260, reviewAbove: 220 },
    alto: { default: 85, min: 60, max: 120 },
    profundidad: { default: 45, min: 35, max: 60 },
    altoSuperior: { default: 90, min: 50, max: 130 },
  },
  recibidor: {
    ancho: { default: 100, min: 50, max: 180 },
    alto: { default: 80, min: 40, max: 110 },
    profundidad: { default: 32, min: 20, max: 50 },
  },
} satisfies Record<string, Record<string, MedidaConfig>>;
