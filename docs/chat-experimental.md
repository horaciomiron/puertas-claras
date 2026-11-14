# Asistente conversacional (experimental, v2.3)

Pestaña **Asistente (prueba)**. Recorre **toda** la entrevista (las mismas preguntas de `backend/config/interview.json`, con sus condiciones y opcionales) en formato de chat y, al final, entrega las respuestas a la **misma pantalla de revisión y envío** del formulario (corregir, aviso de privacidad, número de seguimiento, bandeja del operador).

## Cómo funciona cada tipo de pregunta
| Tipo | Qué hace el asistente |
|---|---|
| Opciones (única o múltiple) | La persona escribe con sus palabras; el sistema **propone** y ella **confirma** (o elige a mano). |
| Campos de un grupo (datos, denunciado, causa, etc.) | Pregunta uno por uno; los de opciones se interpretan, los de texto se guardan tal cual. |
| Texto libre (nombre, domicilio, teléfono, relato, hecho nuevo) | Se guarda **tal cual**; nunca se interpreta ni se envía a la IA. |
| Opcionales | Botón "Saltar esta pregunta". |
| Corregir | "Volver a la anterior" y, en el resumen final, "Corregir" en cada respuesta. |

## Reglas de diseño
- La IA solo elige entre opciones permitidas (se descartan valores inventados; "ninguna" no convive con otras). **No decide** prioridad, juzgado ni riesgo: eso sigue en las reglas visibles del legajo.
- La emergencia se detecta con código fijo **antes** de llamar a cualquier IA.
- El texto interpretado no se guarda ni se registra en el servidor. No se guarda nada hasta que la persona envía desde el resumen.
- Si la IA falla o no hay clave, se usa un respaldo por reglas simples (se informa en pantalla).
- Siempre hay una vía manual ("Prefiero elegir una opción").

## Activar la IA (opcional)
Variables en el hosting del backend (Render → Environment), **nunca en GitHub**:
- `GEMINI_API_KEY`: clave de Google AI Studio.
- `GEMINI_MODEL`: modelo (por defecto `gemini-2.5-flash`; verificar disponibilidad y límites del nivel gratuito).
Sin `GEMINI_API_KEY` el asistente funciona con reglas simples.

## API
- `GET /api/chat/pasos` → `{ modo: 'ia' | 'reglas' }`.
- `POST /api/chat/turno` `{ paso, texto }` → `{ emergencia, valores, etiquetas, entendido, via }`. Solo acepta preguntas de opciones.

## Para ampliar o ajustar
Las reglas de respaldo por pregunta están en `backend/src/services/chat.js` (`REGLAS`). Una pregunta nueva de `interview.json` funciona sin tocar el asistente; si es de opciones y no tiene regla propia, usa reglas generales (sí/no y palabras de la etiqueta) o la IA.
