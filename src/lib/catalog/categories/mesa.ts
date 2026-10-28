import { MEDIDAS } from "@/config/medidas";
import { dim } from "../dim";
import { box, cornerLegs, opt, type LegStyle } from "../parts";
import type { CategoryDefinition, Issue, Part } from "../types";

const M = MEDIDAS.mesa;

export const mesa: CategoryDefinition = {
  id: "mesa",
  slug: "mesas",
  name: "Mesas",
  singular: "mesa",
  article: "la",
  tagline: "Para comer, reunirse y compartir.",
  description:
    "Diseñá tu mesa de comedor en madera maciza: elegí el largo, el ancho y la altura, el tipo de patas, la tapa y la especie de madera.",
  dimensions: [
    dim("largo", "Largo", M.largo, { help: "Medida del lado más largo de la tapa." }),
    dim("ancho", "Ancho", M.ancho, { help: "Medida del lado corto de la tapa." }),
    dim("alto", "Altura total", M.alto, { help: "Desde el piso hasta la parte de arriba de la tapa. Lo habitual para comer sentado ronda los 75 cm." }),
  ],
  options: [
    {
      key: "patas",
      label: "Patas",
      group: "Base",
      type: "choice",
      default: "conicas",
      choices: [
        { value: "conicas", label: "Cónicas", description: "Se afinan hacia el piso." },
        { value: "rectas", label: "Rectas", description: "Sección cuadrada, clásicas." },
        { value: "torneadas", label: "Redondas", description: "Sección circular." },
        { value: "caballete", label: "Caballete", description: "Dos apoyos unidos por un travesaño." },
        { value: "placas", label: "Laterales macizos", description: "Dos placas de madera en los extremos." },
      ],
    },
    {
      key: "faldon",
      label: "Faldón bajo la tapa",
      help: "Marco perimetral que une las patas debajo de la tapa.",
      group: "Base",
      type: "toggle",
      default: false,
      visibleWhen: (d) => ["conicas", "rectas", "torneadas"].includes(String(d.options.patas)),
    },
    {
      key: "esquinas",
      label: "Esquinas de la tapa",
      group: "Tapa",
      type: "choice",
      default: "redondeadas",
      choices: [
        { value: "rectas", label: "Rectas" },
        { value: "redondeadas", label: "Redondeadas" },
      ],
    },
    {
      key: "espesorTapa",
      label: "Espesor de la tapa",
      group: "Tapa",
      type: "choice",
      default: "4",
      choices: [
        { value: "3", label: "3 cm", description: "Más liviana a la vista." },
        { value: "4", label: "4 cm" },
        { value: "5", label: "5 cm", description: "Más robusta a la vista." },
      ],
    },
  ],
  templates: [
    {
      id: "nordica",
      name: "Nórdica",
      description: "Patas cónicas, esquinas suaves y tapa limpia.",
      options: { patas: "conicas", faldon: false, esquinas: "redondeadas", espesorTapa: "4" },
    },
    {
      id: "clasica",
      name: "Clásica",
      description: "Patas rectas con faldón y esquinas rectas.",
      options: { patas: "rectas", faldon: true, esquinas: "rectas", espesorTapa: "4" },
    },
    {
      id: "caballete",
      name: "Caballete",
      description: "Dos apoyos laterales con travesaño y tapa gruesa.",
      dimensions: { largo: 200, ancho: 95 },
      options: { patas: "caballete", esquinas: "rectas", espesorTapa: "5" },
    },
  ],
  defaultTemplateId: "nordica",
  build: (d) => {
    const L = d.dimensions.largo;
    const A = d.dimensions.ancho;
    const H = d.dimensions.alto;
    const t = Number(opt(d.options, "espesorTapa", "4"));
    const patas = opt(d.options, "patas", "conicas");
    const parts: Part[] = [];
    parts.push(
      box("tapa", [0, H - t / 2, 0], [L, t, A], "x", "wood", {
        cornerRadius: opt(d.options, "esquinas", "redondeadas") === "redondeadas" ? Math.min(8, A / 6) : 0,
      }),
    );
    const legH = H - t;
    if (patas === "caballete") {
      const xFoot = L / 2 - Math.min(30, L * 0.15);
      for (const [i, x] of [-xFoot, xFoot].entries()) {
        parts.push(box(`caballete-${i}-pie`, [x, 4, 0], [8, 8, A - 12], "z"));
        parts.push(box(`caballete-${i}-poste`, [x, legH / 2, 0], [8, legH - 14, 14], "y"));
        parts.push(box(`caballete-${i}-cabezal`, [x, legH - 3, 0], [8, 6, A - 16], "z"));
      }
      parts.push(box("travesano", [0, legH * 0.42, 0], [2 * xFoot - 8, 9, 4], "x"));
    } else if (patas === "placas") {
      const x = L / 2 - Math.min(18, L * 0.1);
      parts.push(box("placa-izq", [-x, legH / 2, 0], [5, legH, A - 14], "y"));
      parts.push(box("placa-der", [x, legH / 2, 0], [5, legH, A - 14], "y"));
      parts.push(box("travesano", [0, legH - 6, 0], [2 * x - 5, 8, 3], "x"));
    } else {
      const section = 7;
      const inset = 6;
      parts.push(...cornerLegs("pata", patas as LegStyle, L, A, legH, inset, section));
      if (opt(d.options, "faldon", false)) {
        const fh = 9;
        const ft = 2.2;
        const y = legH - fh / 2;
        const zf = A / 2 - inset - ft / 2;
        const xf = L / 2 - inset - ft / 2;
        const lenX = L - 2 * inset - 2 * section;
        const lenZ = A - 2 * inset - 2 * section;
        parts.push(box("faldon-frente", [0, y, zf], [lenX, fh, ft], "x"));
        parts.push(box("faldon-atras", [0, y, -zf], [lenX, fh, ft], "x"));
        parts.push(box("faldon-izq", [-xf, y, 0], [ft, fh, lenZ], "z"));
        parts.push(box("faldon-der", [xf, y, 0], [ft, fh, lenZ], "z"));
      }
    }
    return parts;
  },
  reviewRules: (d) => {
    const issues: Issue[] = [];
    const patas = String(d.options.patas);
    if (d.dimensions.largo > 240 && ["conicas", "rectas", "torneadas"].includes(patas)) {
      issues.push({
        field: "largo",
        message: "En mesas de más de 2,40 m con cuatro patas, el equipo evaluará si hace falta reforzar la estructura.",
      });
    }
    return issues;
  },
};
