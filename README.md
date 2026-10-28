# Kamura Muebles 3D

Plataforma para diseñar muebles de madera a medida en 3D, con asistente de IA y solicitudes de cotización, para **Kamura Muebles**.

El cliente elige un mueble, lo personaliza (medidas, madera, diseño y detalles) viendo los cambios en un modelo 3D real, puede pedirle ayuda a un asistente que aplica cambios sobre el configurador, y envía una **solicitud de cotización** sin registrarse y sin ver precios. Kamura recibe la solicitud con los datos estructurados, imágenes del modelo y un panel para gestionarla.

---

## Contenido

1. [Qué incluye](#qué-incluye)
2. [Arquitectura](#arquitectura)
3. [Ejecutar en local](#ejecutar-en-local)
4. [Variables de entorno](#variables-de-entorno)
5. [Despliegue gratuito paso a paso](#despliegue-gratuito-paso-a-paso)
6. [Administrar el catálogo](#administrar-el-catálogo)
7. [Pruebas](#pruebas)
8. [Seguridad y privacidad](#seguridad-y-privacidad)
9. [Costos y límites de los planes gratuitos](#costos-y-límites-de-los-planes-gratuitos)
10. [Estado y pendientes](#estado-y-pendientes)

---

## Qué incluye

| Área | Detalle |
|---|---|
| **Sitio público** | Inicio, galería de 9 categorías, una página por categoría (SEO), política de privacidad, sitemap, robots, datos estructurados. |
| **Configurador 3D** | Three.js + React Three Fiber. 9 categorías con geometría paramétrica propia, 3 estilos de partida cada una (27 plantillas). Rotación, zoom, vistas frente/lateral/perspectiva, restablecer vista, indicadores de medidas, sombras, texturas de madera procedurales. Alternativa en SVG si el dispositivo no soporta WebGL. |
| **Personalización** | Pasos: Estilo → Medidas → Madera → Diseño → Detalles. Medidas con límites configurables, validación y avisos de "requiere revisión". Opciones que solo aparecen cuando aplican. Deshacer/rehacer. Fotos del ambiente opcionales. |
| **6 maderas** | Petiribí, Lapacho, Incienso, Guayubira, Guatambú y Paraíso, con textura propia (veta, anillos, poros, variación tonal). |
| **Asistente de IA** | Conversa en español rioplatense y modifica el diseño mediante herramientas controladas. El navegador ejecuta cada cambio y le devuelve el resultado real a la IA: nunca confirma un cambio que no se aplicó. Sin clave de IA funciona en "modo básico" (pedidos simples). |
| **Cotización** | Formulario breve (nombre, WhatsApp/teléfono, correo + opcionales). Se guarda en la base **antes** de mostrar el éxito, con imágenes del modelo, JSON del diseño, resumen legible, historial de cambios y origen de la visita. Prevención de duplicados, anti-spam y reintento sin perder el diseño. |
| **Continuidad** | Guardado automático del diseño en el navegador (sin datos personales) y enlace privado para retomarlo desde cualquier dispositivo. |
| **Panel `/admin`** | Protegido con contraseña. Búsqueda, filtros (estado, mueble, fechas), detalle con visor 3D reconstruido desde los datos, descarga de imágenes, exportación JSON y CSV, estados editables, notas internas, registro de actividad (incluye fallas de correo). |
| **Notificaciones** | Correo a Kamura y confirmación al cliente vía Resend (opcional). Si falla, la solicitud queda guardada y la falla se ve en el panel. |
| **Medición** | Eventos de conversión listos para GTM / GA4 / Meta Pixel, solo con consentimiento y sin datos personales. |

## Arquitectura

```
Navegador ──► Next.js 15 (App Router, TypeScript)
               ├─ Páginas públicas (SSG, SEO)
               ├─ Configurador (cliente): Zustand + React Three Fiber
               └─ API (Node):
                    /api/quotes      → valida, guarda (transacción), notifica
                    /api/designs     → enlaces privados de diseño
                    /api/assistant   → proveedor de IA (clave solo en servidor)
                    /api/admin/*     → panel (sesión + verificación de origen)
                         │
                         ├─ PostgreSQL (Supabase en producción, PGlite en local/pruebas)
                         ├─ Resend (correo, opcional)
                         └─ Gemini / Groq vía API compatible con OpenAI (opcional)
```

**Decisiones principales**

- **Geometría paramétrica, no modelos fijos.** Cada categoría tiene una función `build(diseño) → piezas` (cajas y cilindros en cm). La misma función alimenta el visor 3D, la vista SVG alternativa, las medidas exteriores y las pruebas. Las UV se calculan en centímetros reales, así la veta mantiene su escala y dirección en cualquier tamaño.
- **Texturas procedurales.** Se generan en el navegador, son continuas (sin cortes visibles) y no requieren descargar imágenes pesadas. Se libera de la memoria de video la especie que deja de usarse.
- **Una sola vía para modificar el diseño.** La interfaz y la IA usan las mismas acciones (`src/lib/design/actions.ts`), que validan rango, visibilidad e incompatibilidades.
- **Mismo SQL en todos lados.** PGlite (PostgreSQL en WebAssembly) permite desarrollar y probar sin instalar nada; en producción se usa la cadena de conexión de Supabase.
- **Imágenes en la base.** Los renders y fotos (comprimidos en el navegador, máx. 2,5 MB) se guardan en `bytea` y solo se sirven a sesiones de administración. Evita configurar un almacenamiento extra.

### Estructura

```
src/
  app/                      Rutas (sitio, /disenar, /proyecto, /admin, /api)
  config/                   ← Lo que Kamura edita: medidas, maderas, marca, estados, límites
  lib/catalog/              Categorías, plantillas y geometría paramétrica
  lib/design/               Formato versionado, acciones, validación, resumen
  lib/woods/                Maderas y generador de texturas
  lib/three/                Geometrías y materiales para Three.js
  lib/store/                Estado del configurador (borradores, historial)
  lib/assistant/            Herramientas, contexto de la IA, modo básico
  lib/server/               Base de datos, solicitudes, correo, IA, auth, seguridad
  components/               Configurador, visor, asistente, flujo, panel, sitio
scripts/                    Migraciones, hash de contraseña, imágenes del catálogo
tests/                      Pruebas (Vitest)
```

## Ejecutar en local

Requisitos: Node 20 o superior.

```bash
npm install
cp .env.example .env.local
# Generá el acceso al panel y pegalo en .env.local:
npm run admin:hash -- "una contraseña larga"
npm run dev
```

Abrí http://localhost:3000. Sin `DATABASE_URL` se usa una base local en `./.data/pglite` (se crea sola). Sin `AI_API_KEY` el asistente funciona en modo básico.

Comandos:

| Comando | Para qué |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm test` | Pruebas |
| `npm run lint` | Verificación de tipos |
| `npm run build && npm start` | Versión de producción |
| `npm run db:migrate` | Crear/actualizar tablas en la base configurada |
| `npm run admin:hash -- "clave"` | Generar `ADMIN_PASSWORD_HASH` |
| `node scripts/render-catalog.js` | Regenerar las imágenes del catálogo desde los modelos 3D (con `npm run dev` corriendo y Playwright instalado) |

## Variables de entorno

Ver [`.env.example`](.env.example), que tiene todas las variables comentadas. Las imprescindibles en producción:

| Variable | Obligatoria | Uso |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Sí | URL pública, para enlaces en correos y SEO |
| `APP_SECRET` | Sí | Secreto (≥ 32 caracteres) para cifrar IPs y derivar tokens |
| `DATABASE_URL` | Sí | PostgreSQL (Supabase, *Transaction pooler*) |
| `ADMIN_PASSWORD_HASH` | Sí | Acceso al panel (`npm run admin:hash`) |
| `AI_API_KEY` | No | Asistente con IA (sin ella: modo básico) |
| `RESEND_API_KEY`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL` | No | Correos |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | No | Anti-robots adicional |
| `NEXT_PUBLIC_WHATSAPP`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_INSTAGRAM_URL` | No | Contacto visible en el sitio |
| `NEXT_PUBLIC_GTM_ID` / `NEXT_PUBLIC_GA4_ID` / `NEXT_PUBLIC_META_PIXEL_ID` | No | Medición |

Nunca subas `.env.local` ni valores reales al repositorio (ya está en `.gitignore`).

## Despliegue gratuito paso a paso

**Recomendación:** publicar la app en un subdominio, por ejemplo **`disena.kamuramuebles.com.ar`**, y enlazarla desde el sitio actual. Así no se toca el sitio existente ni su hosting, y cada parte se mantiene por separado. (También se puede mostrar dentro del sitio actual con un `iframe`; ya está permitido por la cabecera `frame-ancestors`.)

Servicios (todos con plan gratuito):

| Servicio | Para qué | Notas del plan gratuito |
|---|---|---|
| **Netlify** | Hosting de la app | Permite uso comercial. (El plan Hobby de Vercel no lo permite.) |
| **Supabase** | Base PostgreSQL | 500 MB. Pausa el proyecto tras 7 días sin actividad: lo evita el flujo `keepalive.yml`. |
| **Google AI Studio (Gemini)** | Asistente de IA | Cuota diaria gratuita. En el plan gratuito, Google puede usar los datos para mejorar sus productos. Alternativa: Groq. |
| **Resend** | Correos | 100 correos/día. Requiere verificar el dominio (registros DNS). |
| **Cloudflare Turnstile** | Anti-robots | Opcional. |

1. **Repositorio.** Subí este proyecto a GitHub (privado).
2. **Base de datos.** En [supabase.com](https://supabase.com) creá un proyecto (región São Paulo, la más cercana). En *Project Settings → Database → Connection string*, copiá la del **Transaction pooler** (puerto 6543) con tu contraseña. Las tablas se crean solas en el primer uso (o con `DATABASE_URL=... npm run db:migrate`). Quedan en el esquema `kamura`, no expuesto por la API pública de Supabase, y con RLS activado.
3. **Hosting.** En [netlify.com](https://netlify.com): *Add new site → Import from Git*, elegí el repositorio (la configuración está en `netlify.toml`). Cargá las variables de entorno en *Site configuration → Environment variables*.
4. **Dominio.** En Netlify: *Domain management → Add a domain* → `disena.kamuramuebles.com.ar`. En el DNS del dominio (donde esté administrado hoy), agregá un registro **CNAME** `disena` → `<tu-sitio>.netlify.app`. Netlify emite el certificado HTTPS automáticamente. Actualizá `NEXT_PUBLIC_SITE_URL`.
5. **IA (opcional).** Creá una clave en [aistudio.google.com/apikey](https://aistudio.google.com/apikey) y cargala como `AI_API_KEY`.
6. **Correo (opcional).** En [resend.com](https://resend.com) verificá `kamuramuebles.com.ar` (registros DNS que indica Resend), creá una API key y definí `MAIL_FROM` (p. ej. `Kamura Muebles <disena@kamuramuebles.com.ar>`) y `ADMIN_NOTIFY_EMAIL`.
7. **Mantener activa la base.** En GitHub, *Settings → Secrets and variables → Actions → Variables*, creá `APP_URL` con la URL pública.
8. **Verificar.** Abrí `/api/health` (debe responder `database: ok`), hacé una solicitud de prueba y revisala en `/admin`.

**Accesos que hacen falta de parte de Kamura:** administración del DNS de `kamuramuebles.com.ar` (CNAME y registros de Resend), y una cuenta (o invitación) en GitHub, Netlify, Supabase, Google AI Studio y Resend. No se necesita acceso al hosting actual del sitio.

## Administrar el catálogo

Todo lo editable está en `src/config/`:

- **Medidas y límites** (`medidas.ts`): valor sugerido, mínimo, máximo y umbrales de "requiere revisión" por categoría. **Los valores actuales son orientativos**: Kamura debe ajustarlos a su capacidad real.
- **Maderas** (`maderas.ts`): para sumar una especie, agregá un objeto con id, nombre, descripción visual y parámetros de textura. El formato admite sumar especies sin tocar el resto del código.
- **Marca** (`marca.ts`): sitio principal y **fotos reales de proyectos**. Copiá las fotos a `public/proyectos/` y listalas en `fotosProyectos`; la sección "Proyectos realizados" aparece sola.
- **Estados** (`estados.ts`) y **límites de archivos** (`limites.ts`).
- **Plantillas**: en cada categoría (`src/lib/catalog/categories/*.ts`), lista `templates` (medidas + opciones de partida).
- **Nueva categoría**: crear `src/lib/catalog/categories/<id>.ts` con su `build`, sumarla en `src/lib/catalog/index.ts` y en el tipo `CategoryId`. Las pruebas del catálogo la validan automáticamente.

**Formato del diseño.** Cada diseño guarda `schemaVersion`. Si cambia la estructura, subí `DESIGN_SCHEMA_VERSION` y agregá la conversión en `migrateDesign()`. Los diseños viejos completan opciones nuevas con sus valores por defecto.

## Pruebas

`npm test` ejecuta 90 pruebas:

- **Catálogo:** las 27 plantillas generan geometría válida, sin piezas duplicadas y dentro de rango.
- **Diseño:** cambio de medidas (y escala del modelo), rechazo de valores fuera de rango, cambio de las 6 maderas, componentes (estantes, cajones), incompatibilidades, serialización y migración.
- **Asistente:** traducción de herramientas a acciones, modo básico ("un poco más larga", "tres cajones", "volvamos al diseño anterior"), contexto de la IA, recorte de historial, cliente del proveedor con respuestas simuladas.
- **Solicitudes:** guardado completo con base real (PGlite), idempotencia, validación de contacto, campo trampa, tiempo mínimo, diseño inválido, archivos no imagen, límite por conexión, estados y notas, enlaces privados.
- **Acceso administrativo:** rutas rechazan pedidos sin sesión, verificación de origen, sesión válida y revocada, bloqueo por intentos.

Además se verificó en Chromium (escritorio y emulación de iPhone 13) el flujo completo: configurar, usar el asistente, deshacer, recargar sin perder el diseño, enlace privado, revisión, envío, confirmación, ingreso al panel, búsqueda, cambio de estado, notas y exportación.

## Seguridad y privacidad

- Claves solo en variables de entorno del servidor; la IA se llama exclusivamente desde `/api/assistant`.
- Panel: contraseña con hash scrypt, sesiones aleatorias guardadas como hash, cookie `httpOnly` + `SameSite=Strict` + `Secure`, verificación de origen en escrituras, límite de intentos.
- Solicitudes con identificadores no predecibles (UUID + código aleatorio); los archivos solo se sirven a administradores.
- Enlaces de diseño con tokens de 192 bits guardados como hash y con vencimiento (365 días); no exponen datos personales.
- Anti-spam: campo trampa, tiempo mínimo de llenado, límite por conexión (IP cifrada, no se guarda la IP real), Turnstile opcional.
- Archivos: tipo verificado por contenido (no por extensión), tamaño máximo, compresión previa en el navegador.
- IA: límite por conexión, límite diario global (`AI_DAILY_LIMIT`), tope de tokens, máximo 3 rondas de herramientas por mensaje y validación de cada cambio.
- En el navegador se guarda solo la configuración del mueble, nunca datos de contacto ni fotos.
- Política de privacidad orientada a la Ley 25.326. **Debe revisarla Kamura** (responsable, canal de contacto).

## Costos y límites de los planes gratuitos

Con los planes gratuitos el costo mensual es **$0**. Límites a tener en cuenta: la base de 500 MB de Supabase alcanza aproximadamente para 1.000 a 2.000 solicitudes con fotos (los renders pesan ~60–150 KB cada uno); los 100 correos diarios de Resend equivalen a unas 50 solicitudes por día (2 correos cada una); la cuota gratuita de Gemini es diaria y, si se agota, el asistente pasa a modo básico. Si el volumen crece, el primer paso es mover las fotos a un almacenamiento de archivos.

## Estado y pendientes

**Hecho y verificado:** las 9 categorías completas, 6 maderas, configurador, asistente (modo básico verificado en navegador; integración con IA verificada con respuestas simuladas), solicitudes con persistencia, panel y responsive.

**No verificado en este entorno (requiere credenciales reales):**
- Respuestas de un modelo de IA real (Gemini/Groq).
- Envío real de correos con Resend.
- Conexión a Supabase y despliegue en Netlify/DNS.
- Turnstile.

**Pendiente de Kamura:**
- Ajustar los límites de medidas en `src/config/medidas.ts`.
- Confirmar las descripciones visuales de las maderas.
- Logo real (hoy se usa un logotipo tipográfico) y fotos reales de proyectos.
- Datos de contacto (variables `NEXT_PUBLIC_*`) y revisión de la política de privacidad.
- Plazos de respuesta (el sistema no promete ninguno).
