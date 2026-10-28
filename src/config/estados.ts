/** Estados de una solicitud. El orden define cómo se muestran en el panel. */
export const ESTADOS = [
  { id: "nueva", label: "Nueva solicitud" },
  { id: "en_revision", label: "En revisión" },
  { id: "necesita_info", label: "Necesita información adicional" },
  { id: "cotizacion_enviada", label: "Cotización enviada" },
  { id: "aceptada", label: "Aceptada" },
  { id: "no_concretada", label: "No concretada" },
] as const;

export type EstadoId = (typeof ESTADOS)[number]["id"];
export const ESTADO_IDS = ESTADOS.map((e) => e.id) as [EstadoId, ...EstadoId[]];
export const estadoLabel = (id: string) => ESTADOS.find((e) => e.id === id)?.label ?? id;
