# Cambios de la versión 2
Surgieron de la revisión del equipo (13/11/2026).

**Se mantuvo:** separación ciudadanía/operador, ingreso sin DNI obligatorio, código de borrador, login del operador, bandeja, filtros, responsable, historial, seguimiento con código, datos ficticios y diseño.

**Se modificó**
- Alcance exclusivo: violencia familiar y de género. Ya no hay "materia" ni ramas generales.
- Entrada directa: denuncia nueva · causa existente · emergencia. La pregunta de peligro inmediato es la primera.
- Denuncia nueva: persona afectada, datos mínimos (DNI opcional), persona denunciada, niños/as y vulnerabilidades, tipos de violencia con una pregunta breve por tipo, atención médica (sin pedir certificados ni pruebas), antecedentes, indicadores de prioridad, medidas, relato opcional (audio = función futura).
- Causa existente: informar hecho nuevo, incumplimiento, actualizar datos o consultar, sin repetir preguntas personales.
- Derivación: fecha de ingreso → juzgado de turno → antecedente → posible prevención/conexidad → juzgado sugerido → validación del operador. Reglas ficticias en `backend/config/derivacion.json`.
- Panel del operador por bloques: prioridad (con indicadores, sin puntaje), datos básicos, situación, medidas solicitadas, datos para notificación, derivación, responsable (Flor, Caro, Susana; correo simulado) y estado.

**Se eliminó:** consumo, vivienda, salud, discapacidad como materia, laboral, vecinal, mediación general, fiscalía penal y orientación general.

Los responsables usan nombres de pila y correos ficticios (`@ejemplo.invalid`). Los datos guardados por la versión anterior se descartan al arrancar (eran de demostración).
