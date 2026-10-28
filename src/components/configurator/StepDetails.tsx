"use client";
import { DETAILS_LIMITS, type Design, type DesignDetails } from "@/lib/design/design";
import { useConfigurator } from "@/lib/store/configurator";
import { AttachmentPicker } from "./AttachmentPicker";

const FIELDS: { key: keyof DesignDetails; label: string; hint: string; placeholder: string; multiline: boolean }[] = [
  {
    key: "preferencias",
    label: "Preferencias de diseño",
    hint: "Estilo, terminación que te gusta, colores del ambiente…",
    placeholder: "Ej.: me gusta que se vea liviano, el piso es de cerámica clara.",
    multiline: true,
  },
  {
    key: "notas",
    label: "Observaciones para el carpintero",
    hint: "Requisitos particulares, usos especiales, restricciones del lugar.",
    placeholder: "Ej.: tiene que pasar por una puerta de 80 cm; vamos a guardar una consola de juegos.",
    multiline: true,
  },
  {
    key: "referencia",
    label: "Referencia de inspiración",
    hint: "Un enlace a una foto o publicación que te guste.",
    placeholder: "https://…",
    multiline: false,
  },
];

export function StepDetails({ design }: { design: Design }) {
  const dispatch = useConfigurator((s) => s.dispatch);
  return (
    <div>
      <h2>Detalles</h2>
      <p className="panel-intro">Todo es opcional. Lo que nos cuentes ayuda al equipo a preparar una propuesta precisa.</p>
      {FIELDS.map((f) => {
        const id = `det-${f.key}`;
        const Tag = f.multiline ? "textarea" : "input";
        return (
          <div className="field" key={f.key}>
            <label htmlFor={id}>{f.label}</label>
            <Tag
              id={id}
              className={f.multiline ? "textarea" : "input"}
              value={design.details[f.key]}
              maxLength={DETAILS_LIMITS[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => dispatch({ type: "setDetails", patch: { [f.key]: e.target.value } })}
            />
            <p className="hint">{f.hint}</p>
          </div>
        );
      })}
      <AttachmentPicker />
      <p className="small muted" style={{ marginTop: 10 }}>
        Las fotos no se guardan en este dispositivo: se envían junto con tu solicitud.
      </p>
    </div>
  );
}
