# Clara: asistente acompañante (v2.4)

Personaje animado abajo a la derecha (visible en Inicio y Acceso ciudadano; **no** en el panel del operador). Abre un chat que sabe en qué pregunta está la persona y la **explica con palabras simples**. Respeta `prefers-reduced-motion`, se cierra con Esc y es navegable con teclado.

## Qué hace y qué no
- Explica la pregunta actual, aclara términos (medida de protección, DNI opcional, prioridad, derivación) y explica qué pasa después de enviar.
- **No** decide prioridad, riesgo ni juzgado; **no** da asesoramiento legal; **no** pide datos personales.
- La emergencia se detecta con código fijo **antes** de llamar a la IA: muestra 911 y 144.

## Privacidad
- La app envía al servidor solo el **ID de la pregunta** y la duda escrita (máx. 300 caracteres). **Nunca** las respuestas del formulario ni datos personales.
- No se guarda ni se registra el mensaje.
- Con IA activa, la duda escrita viaja a un servicio externo (Gemini); la pantalla lo avisa.

## Modos
- **Con IA**: si el backend tiene `GEMINI_API_KEY`.
- **Respuestas guía** (sin IA): explicaciones ya escritas para cada pregunta (`backend/src/services/ayuda.js`). También es el respaldo si la IA falla.

## Activar la IA
En Render → Environment (nunca en GitHub): `GEMINI_API_KEY` y, opcional, `GEMINI_MODEL` (por defecto `gemini-2.5-flash`; verificar disponibilidad y límites gratuitos).

## API
- `GET /api/ayuda` → `{ nombre, modo }`
- `POST /api/ayuda` `{ paso, mensaje? }` → `{ respuesta, emergencia, via }`

## Nota
La pestaña "Asistente (prueba)" (chat que completa toda la entrevista) se quitó de la pantalla. Su código sigue en el proyecto (`Chat.jsx`, `/api/chat`) por si se quiere retomar; ver `chat-experimental.md`.
