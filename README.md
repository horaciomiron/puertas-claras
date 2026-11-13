# Puertas Claras v.2

> Prototipo académico (PIL 2026) · **Datos 100 % ficticios.** No constituye una presentación judicial ni genera un expediente.

Aplicación web de acceso a la Justicia, **limitada a violencia familiar y de género** (OGU).
La persona responde una **entrevista guiada** (denuncia nueva, causa existente o emergencia) en lenguaje claro y el sistema arma un **legajo inteligente** (resumen ordenado de su situación y pedido) que se **deriva** al área que corresponde. El personal de la OGU lo recibe, revisa, cambia el estado y gestiona desde un **panel**.

La herramienta organiza y destaca; **la evaluación y la decisión son siempre humanas**. Toda derivación requiere validación de una persona.

> Cambios de la v2: ver `docs/cambios-v2.md`.

## Estructura
```
frontend/   React + Vite (interfaz ciudadana y panel del operador/a)
backend/    Node + Express (API REST JSON, datos en archivos JSON)
docs/       Documentación (privacidad, API, decisiones, pruebas, capturas)
```

## Requisitos
Node.js 18 o superior (recomendado 20/22) y npm.

## Cómo correrlo (Windows / PowerShell, dos ventanas)
**Ventana 1 – backend**
```powershell
cd backend
npm install
npm run dev      # http://localhost:3001
```
**Ventana 2 – frontend**
```powershell
cd frontend
npm install
npm run dev      # http://localhost:5173
```
Si PowerShell bloquea scripts: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

## Variables de entorno
| Parte | Variable | Para qué | Default |
|---|---|---|---|
| frontend | `VITE_API_URL` | URL del backend | `http://localhost:3001` |
| backend | `PORT` | Puerto | `3001` |
| backend | `ALLOWED_ORIGINS` | Orígenes CORS (coma) | `*` (en producción poné la URL del frontend) |
| backend | `STAFF_USER` / `STAFF_PASSWORD` | Credenciales **provisorias** del panel | `operador.demo` / `demo-2026` |
| backend | `DATA_DIR` | Carpeta de datos | `backend/data` |

Copiá `.env.example` a `.env` en cada carpeta si querés cambiarlas. Los `.env` y `backend/data/` **no se suben a GitHub** (`.gitignore`).

## Pruebas
```powershell
cd backend ; npm test                 # 7 pruebas automáticas de la API
```
Prueba de navegador (opcional, requiere Playwright): ver `docs/pruebas.md`.

## Usuarios de demostración (PROVISORIOS)
- **Persona usuaria:** no usa DNI. Recibe un *código de borrador* anónimo (`PC-XXXXXX`) y, al enviar, un *número de seguimiento* (`SEG-XXXXXX`).
- **Operador/a:** `operador.demo` / `demo-2026`. Es una autenticación **de demostración**, no es seguridad real.

## Endpoints (resumen; detalle en `docs/api.md`)
`GET /api/health` · `GET /api/entrevista` · `POST /api/auth/ciudadania` · `POST /api/auth/operador` · `PUT|DELETE /api/borrador` · `POST /api/legajo/vista-previa` · `POST /api/presentaciones` · `GET /api/seguimiento/:codigo` · `GET /api/catalogos` · `GET /api/legajos` · `GET|PATCH /api/legajos/:id` · `GET /api/estadisticas`

## Decisiones clave (ver `docs/decisiones.md`)
- La entrevista, los organismos y las reglas de derivación viven en `backend/config/*.json`, **separadas del código**: cada jurisdicción carga los suyos. Hoy son organismos **ficticios**.
- Capa de datos intercambiable (`backend/src/repo/fileRepo.js`) para pasar luego a una base real.
- Privacidad por diseño: sin DNI ni domicilio; el legajo no guarda el código de borrador; el navegador no guarda nada.
- Accesibilidad: lenguaje claro, una pregunta por pantalla, contraste alto, botones grandes, teclado, lector de pantalla, celular, tamaño de texto ajustable. Ver `docs/brasilia.md`.

## Publicación gratuita
Backend en **Render** (Root Directory `backend`, Build `npm install`, Start `npm start`, variable `ALLOWED_ORIGINS`) y frontend en **Vercel** (Root Directory `frontend`, variable `VITE_API_URL` = URL de Render). Orden: primero Render, después Vercel, y por último ajustar `ALLOWED_ORIGINS`. Nota: el plan gratuito de Render duerme tras inactividad (la primera carga tarda ~1 minuto) y sus archivos no son permanentes: sirve para demostración, no para datos reales.

## Antes de usar datos reales
Ver `docs/antes-de-datos-reales.md`.
