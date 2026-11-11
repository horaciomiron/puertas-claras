# Guía de pruebas
## Automáticas
- **API:** `cd backend ; npm test` → 7 pruebas (salud, 404/JSON inválido, 401/403, login, flujo borrador→envío→seguimiento→gestión, orden por prioridad, minimización de datos).
- **Navegador (Playwright):** con backend en `:3001` y el frontend compilado (`npm run build ; npx vite preview --port 4173`):
  `cd frontend ; npm i -D playwright ; npx playwright install chromium ; node e2e/smoke.mjs` → recorre urgencia, entrevista con validación, legajo, consentimiento, seguimiento, login (error y éxito), filtros, derivación con validación de fundamento, estadísticas y vista móvil. Guarda capturas en `docs/capturas/`.
## Manuales sugeridos (con los casos ficticios sembrados)
Orientación (DEMO-001) · urgencia (DEMO-002) · posible intervención judicial (DEMO-003, con expediente previo) · derivación (DEMO-004) · discapacidad (DEMO-005) · persona adulta mayor (DEMO-006) · no sabe clasificar (DEMO-007) · información adicional (DEMO-008) · sin intervención (DEMO-009).
Verificar además: teclado (Tab/Enter/Espacio), lector de pantalla (NVDA), zoom 200 %, botón A+.
