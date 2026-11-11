# API REST (JSON)
Base: `/api`. Errores siempre JSON: `{ "error": "mensaje", "detalles": [...] }` con 400 (datos inválidos), 401/403 (sin sesión/permiso), 404 (no existe), 429 (demasiados intentos) o 500 (error interno sin detalles).
Autenticación provisoria: `Authorization: Bearer <token>` (token en memoria del servidor).

| Método y ruta | Quién | Descripción |
|---|---|---|
| GET `/health` | público | Estado del servicio |
| GET `/entrevista` | público | Definición de la entrevista (preguntas, opciones, emergencia) |
| POST `/auth/ciudadania` | público | Body `{}` crea código `PC-XXXXXX`; `{codigo}` retoma borrador |
| POST `/auth/operador` | público | `{usuario, clave}` → token |
| PUT `/borrador` | ciudadanía | `{answers, paso}` guarda borrador (validación parcial) |
| DELETE `/borrador` | ciudadanía | Borra el borrador |
| POST `/legajo/vista-previa` | ciudadanía | `{answers}` → legajo ordenado (no guarda) |
| POST `/presentaciones` | ciudadanía | `{answers, consentimiento:true}` → crea legajo y `codigoSeguimiento` |
| GET `/seguimiento/:codigo` | público | Estado simplificado (sin datos sensibles) |
| GET `/catalogos` | operador | Estados, resultados, responsables, organismos, materias |
| GET `/legajos` | operador | Filtros: `q, desde, hasta, materia, prioridad, estado, responsable (__none), organismo, origen` |
| GET `/legajos/:id` | operador | Detalle completo |
| PATCH `/legajos/:id` | operador | `{estado?, responsable?, resultado?{tipo, fundamento, organismoId?, proximaActuacion?, observaciones?, mensajePersona?}}` |
| GET `/estadisticas` | operador | Indicadores agregados |

Resultados posibles (evaluación humana): `intervencion_judicial`, `info_adicional`, `derivacion`, `orientacion`, `sin_intervencion`. El fundamento es obligatorio; en `derivacion` también el organismo receptor.
