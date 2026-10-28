export type StepId = "estilo" | "medidas" | "madera" | "diseno" | "detalles";

export const STEPS: { id: StepId; label: string }[] = [
  { id: "estilo", label: "Estilo" },
  { id: "medidas", label: "Medidas" },
  { id: "madera", label: "Madera" },
  { id: "diseno", label: "Diseño" },
  { id: "detalles", label: "Detalles" },
];
