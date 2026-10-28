import type { Metadata } from "next";
import { MARCA } from "@/config/marca";

export const metadata: Metadata = {
  title: "Privacidad y tratamiento de datos",
  description: "Cómo Kamura Muebles trata los datos que enviás desde el configurador de muebles.",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacidadPage() {
  const email = MARCA.contacto.email;
  return (
    <section className="section">
      <div className="container prose">
        <h1>Privacidad y tratamiento de datos</h1>
        <p>
          Esta política explica qué datos recopila el configurador de {MARCA.nombre} y para qué se usan, conforme a la Ley
          25.326 de Protección de los Datos Personales de la República Argentina.
        </p>

        <h2>Qué datos recopilamos</h2>
        <ul>
          <li>Los datos que completás al solicitar una cotización: nombre y apellido, teléfono o WhatsApp, correo electrónico y, si querés, localidad, provincia, comentarios y fotos.</li>
          <li>La configuración del mueble que diseñaste (tipo, medidas, madera, opciones y observaciones) y un historial de los cambios realizados.</li>
          <li>Datos técnicos mínimos para prevenir abusos: una versión cifrada (no reversible) de tu dirección IP y, si llegaste desde una campaña, su origen.</li>
        </ul>

        <h2>Para qué los usamos</h2>
        <p>
          Únicamente para revisar tu diseño, comunicarnos con vos y preparar una cotización personalizada. No vendemos ni
          cedemos tus datos a terceros con fines comerciales.
        </p>

        <h2>Qué se guarda en tu dispositivo</h2>
        <p>
          El configurador guarda en tu navegador solo la configuración del mueble, para que no pierdas tu trabajo si cerrás
          la pestaña. No guarda tus datos de contacto ni tus fotos. Podés borrarlo limpiando los datos del sitio en tu navegador.
        </p>

        <h2>Asistente de inteligencia artificial</h2>
        <p>
          Los mensajes que escribís en el asistente y la configuración actual del mueble se envían a un proveedor externo
          de inteligencia artificial para generar las respuestas. Te pedimos que no incluyas datos personales en el chat.
          Las conversaciones no se guardan en nuestra base de datos.
        </p>

        <h2>Servicios que intervienen</h2>
        <p>
          Para funcionar, el sitio utiliza servicios de alojamiento, base de datos, envío de correos e inteligencia
          artificial que pueden almacenar o procesar datos fuera de la Argentina. Los datos de las solicitudes se guardan
          en una base de datos privada, accesible solo para el equipo de {MARCA.nombre}.
        </p>

        <h2>Medición</h2>
        <p>
          Si el sitio usa herramientas de medición, solo se activan si las aceptás, y nunca se les envían tus datos de
          contacto.
        </p>

        <h2>Tus derechos</h2>
        <p>
          Podés pedir acceso, rectificación, actualización o supresión de tus datos
          {email ? (
            <>
              {" "}escribiendo a <a href={`mailto:${email}`}>{email}</a>
            </>
          ) : (
            " comunicándote con Kamura por sus canales habituales"
          )}
          . La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de la Ley 25.326, tiene la
          atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por
          incumplimiento de las normas vigentes en materia de protección de datos personales.
        </p>
      </div>
    </section>
  );
}
