# Guía de pruebas
## Automáticas
- **API:** `cd backend ; npm test` → 8 pruebas (salud, 404/JSON inválido, 401/403, login, flujo borrador→envío→seguimiento→gestión, orden por prioridad, minimización de datos).
- **Navegador (Playwright):** con backend en `:3001` y el frontend compilado (`npm run build ; npx vite preview --port 4173`):
  `cd frontend ; npm i -D playwright ; npx playwright install chromium ; node e2e/smoke.mjs` → recorre urgencia, entrevista con validación, legajo, consentimiento, seguimiento, login (error y éxito), filtros, derivación con validación de fundamento, estadísticas y vista móvil. Guarda capturas en `docs/capturas/`.
## Manuales sugeridos (con los casos ficticios sembrados)
Denuncia con medidas (DEMO-001) · emergencia (DEMO-002) · posible intervención judicial con antecedente en Juzgado 4 (DEMO-003) · derivación por niñez (DEMO-004) · discapacidad (DEMO-005) · persona adulta mayor (DEMO-006) · no sabe identificar la violencia (DEMO-007) · hecho nuevo con información adicional (DEMO-008) · actualización de datos (DEMO-009).
Verificar además: teclado (Tab/Enter/Espacio), lector de pantalla (NVDA), zoom 200 %, botón A+.
