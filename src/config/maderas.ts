/**
 * MADERAS DISPONIBLES
 *
 * Para sumar una especie, agregá un objeto a esta lista con su id (sin espacios
 * ni tildes), nombre, una descripción visual y los parámetros de su textura.
 * Las descripciones son solo visuales y orientativas: no incluyen propiedades
 * técnicas, precios ni disponibilidad, que debe confirmar Kamura.
 */
export interface WoodTextureParams {
  /** Color base de la madera (madera temprana). */
  base: string;
  /** Color de los anillos / madera tardía. */
  late: string;
  /** Color de vetas o manchas oscuras de baja frecuencia. */
  streak: string;
  /** Cantidad de anillos por cada 100 cm de textura (entero para que la textura sea continua). */
  rings: number;
  /** Intensidad del contraste de anillos (0–1). */
  ringContrast: number;
  /** Ondulación de la veta (0–1). */
  warp: number;
  /** Intensidad de vetas oscuras (0–1). */
  streakAmount: number;
  /** Intensidad de las fibras finas (0–1). */
  fiber: number;
  /** Variación de tono por zonas (0–1). */
  tone: number;
  /** Rugosidad del acabado en el render (0 = brillante, 1 = mate). */
  roughness: number;
}

export interface WoodSpecies {
  id: string;
  name: string;
  /** Descripción visual breve y orientativa. */
  description: string;
  texture: WoodTextureParams;
}

export const MADERAS: WoodSpecies[] = [
  {
    id: "petiribi",
    name: "Petiribí",
    description: "Tono dorado a castaño claro, con vetas suaves algo más oscuras.",
    texture: { base: "#b98a55", late: "#8a6037", streak: "#6e4a2a", rings: 13, ringContrast: 0.55, warp: 0.55, streakAmount: 0.25, fiber: 0.5, tone: 0.35, roughness: 0.55 },
  },
  {
    id: "lapacho",
    name: "Lapacho",
    description: "Castaño oscuro con matices oliváceos y veta cerrada y pareja.",
    texture: { base: "#6f5133", late: "#523a22", streak: "#3d2a18", rings: 22, ringContrast: 0.35, warp: 0.3, streakAmount: 0.3, fiber: 0.65, tone: 0.25, roughness: 0.5 },
  },
  {
    id: "incienso",
    name: "Incienso",
    description: "Castaño amarillento a rojizo, con vetas oscuras bien marcadas.",
    texture: { base: "#a36d3b", late: "#7a4724", streak: "#4d2b16", rings: 16, ringContrast: 0.5, warp: 0.5, streakAmount: 0.55, fiber: 0.5, tone: 0.4, roughness: 0.5 },
  },
  {
    id: "guayubira",
    name: "Guayubira",
    description: "Castaño profundo con vetas negruzcas vistosas y mucho contraste.",
    texture: { base: "#80603f", late: "#5a3f27", streak: "#24170d", rings: 11, ringContrast: 0.6, warp: 0.8, streakAmount: 0.6, fiber: 0.45, tone: 0.45, roughness: 0.5 },
  },
  {
    id: "guatambu",
    name: "Guatambú",
    description: "Muy clara, blanco amarillenta, con veta fina y suave.",
    texture: { base: "#e4d3aa", late: "#cdb688", streak: "#bba274", rings: 18, ringContrast: 0.3, warp: 0.35, streakAmount: 0.1, fiber: 0.35, tone: 0.2, roughness: 0.6 },
  },
  {
    id: "paraiso",
    name: "Paraíso",
    description: "Castaño rosado claro con anillos amplios y bien dibujados.",
    texture: { base: "#bd8665", late: "#8d5839", streak: "#6c3f27", rings: 9, ringContrast: 0.75, warp: 0.7, streakAmount: 0.2, fiber: 0.45, tone: 0.35, roughness: 0.55 },
  },
];

export const DEFAULT_WOOD = "petiribi";

export const WOOD_DISCLAIMER =
  "Las texturas son representaciones digitales orientativas. La tonalidad real varía según cada pieza de madera, su veta, la iluminación y el acabado.";
