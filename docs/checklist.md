# Lista de comprobación de criterios de terminación

| Criterio | Estado | Cómo se verificó |
|---|---|---|
| Elegir una categoría | ✅ | Navegador: galería → configurador; 9 rutas `/disenar/<categoría>` |
| Personalizar un modelo 3D real | ✅ | Capturas de las 27 plantillas renderizadas con WebGL |
| Modificar las dimensiones permitidas | ✅ | Pruebas + navegador (campo, deslizador, error fuera de rango) |
| Seleccionar las seis maderas | ✅ | Pruebas + navegador |
| Cambiar las opciones de diseño | ✅ | Pruebas (estantes, cajones, incompatibilidades) + navegador |
| Rotar, acercar y alejar | ✅ | CameraControls; vistas frente/lateral/perspectiva y restablecer |
| El asistente asesora y ejecuta cambios | ✅ / ⚠️ | Ejecución de cambios verificada (modo básico en navegador, IA con respuestas simuladas). Falta probar con una clave real |
| Los cambios se conservan entre pasos | ✅ | Navegador, incluso al recargar la página |
| Revisar el proyecto | ✅ | `/disenar/revision` |
| Enviar solicitud sin ver precios | ✅ | Navegador; verificación automática de ausencia de precios |
| Persistencia de la solicitud | ✅ | Pruebas con PostgreSQL (PGlite) + navegador |
| Kamura recibe la información necesaria | ✅ | Panel: datos estructurados, resumen, renders, historial, fotos, JSON |
| Recuperar el proyecto | ✅ | Panel (visor 3D + "Abrir en el configurador") y enlace privado |
| Manejo de errores de envío | ✅ | Errores de validación, límites, red; reintento con la misma clave sin duplicar |
| Panel protegido | ✅ | Pruebas de acceso + navegador |
| Funciona en celulares | ✅ | Emulación iPhone 13, sin desplazamiento horizontal |
| Instrucciones de instalación y despliegue | ✅ | README |
| Correos reales | ⚠️ | Implementado; requiere credenciales de Resend para probarlo |
| Despliegue en el dominio | ⏳ | No realizado: requiere cuentas y acceso al DNS |
