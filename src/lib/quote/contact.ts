/** Validación de los datos de contacto (compartida entre el formulario y el servidor). */
import { z } from "zod";

const phoneRe = /^[+()\-\s\d]{6,30}$/;

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Ingresá tu nombre y apellido.").max(120, "El nombre es demasiado largo."),
  phone: z
    .string()
    .trim()
    .regex(phoneRe, "Ingresá un teléfono o WhatsApp válido, con código de área.")
    .refine((v) => v.replace(/\D/g, "").length >= 8, "Ingresá un teléfono o WhatsApp válido, con código de área."),
  email: z.string().trim().toLowerCase().email("Ingresá un correo electrónico válido.").max(160),
  city: z.string().trim().max(80).optional().default(""),
  province: z.string().trim().max(80).optional().default(""),
  comments: z.string().trim().max(2000, "Los comentarios superan los 2000 caracteres.").optional().default(""),
});
export type ContactInput = z.infer<typeof contactSchema>;


export const PROVINCIAS = [
  "Ciudad Autónoma de Buenos Aires",
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

export interface QuoteConfirmation {
  code: string;
  token: string;
  category: string;
  customerEmail: "sent" | "skipped" | "failed";
  summary: string;
}
