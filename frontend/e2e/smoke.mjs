// Prueba de navegador (Playwright). Requiere backend en :3001 y frontend en :4173 (vite preview) o :5173.
// Uso:  node e2e/smoke.mjs [urlFrontend]   (guarda capturas en ../docs/capturas)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import assert from 'node:assert/strict';

const APP = process.argv[2] || 'http://localhost:4173';
import { fileURLToPath } from 'node:url';
const SHOTS = fileURLToPath(new URL('../../docs/capturas/', import.meta.url));
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 })).newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errors.push(m.text()));
const shot = (n) => page.screenshot({ path: SHOTS + n + '.png' });

const respuestas = [
  ['¿Hay peligro ahora', 'No'], ['¿Sobre qué tema', 'Violencia y protección'], ['¿A quién le pasa', 'A mí'],
  ['¿Alguna de estas situaciones', 'Hay niños, niñas'], ['¿Qué cosas te dificultan', 'Vivo lejos'],
  ['¿Pasó alguna', 'Hubo amenazas de muerte'], ['¿Hay una medida', 'No'], ['¿Existe o existió una causa', 'Sí, existe'],
  ['¿Qué necesitás', 'Protección o resguardo'], ['¿Cómo preferís', 'Prefiero no ser'],
];
async function runInterview({ urgente = false } = {}) {
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();
  for (let i = 0; i < 30; i++) {
    const q = (await page.locator('fieldset.q h2').innerText());
    if (urgente && q.startsWith('¿Hay peligro')) {
      await page.locator('.choice', { hasText: 'Sí, hay peligro ahora' }).click();
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await page.locator('.emergency').waitFor(); // aparece antes de pedir datos
      assert.match(await page.locator('.emergency').innerText(), /911/);
      await shot('02-emergencia');
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('fieldset.q h2')?.innerText !== '¿Hay peligro ahora, para vos o para otra persona?');
      continue;
    }
    const hit = respuestas.find(([k]) => q.startsWith(k));
    if (hit) await page.locator('.choice', { hasText: hit[1] }).first().click();
    else if (q.startsWith('Número de expediente')) await page.locator('input.txt').fill('EXP-DEMO-24 (ficticio)');
    else if (q.startsWith('Si querés, contanos')) await page.locator('textarea').fill('Relato ficticio de prueba.');
    if (i === 3) await shot('03-entrevista');
    // validación: pregunta obligatoria sin responder no avanza
    const btn = page.locator('.nav .primary');
    const label = await btn.innerText();
    await btn.click();
    if (label.startsWith('Revisar')) break;
    await page.waitForFunction((old) => document.querySelector('fieldset.q h2')?.innerText !== old, q);
  }
  await page.getByRole('heading', { name: 'Revisá tu legajo' }).waitFor();
}

await page.goto(APP);
await page.getByRole('heading', { name: /Una puerta más clara/ }).waitFor();
await shot('01-caratula');

// 1) Ciudadanía: validación de pregunta obligatoria
await page.getByRole('button', { name: /Quiero hacer una consulta/ }).click();
await page.getByRole('button', { name: 'Empezar', exact: true }).click();
await page.locator('.nav .primary').click();
await page.getByText('Falta responder esta pregunta').waitFor();
await page.goto(APP); await page.getByRole('button', { name: /Quiero hacer una consulta/ }).click();

// 2) Flujo con urgencia → legajo → envío
await runInterview({ urgente: true });
await page.locator('.summary').waitFor();
assert.match(await page.locator('.summary').innerText(), /Prioridad de revisión: Inmediata/);
await shot('04-legajo');
const send = page.getByRole('button', { name: /Enviar consulta/ });
assert.equal(await send.isDisabled(), true); // exige aceptar privacidad
await page.getByLabel(/acepto el aviso de privacidad/).check();
await send.click();
await page.getByText('Tu consulta (simulada) fue recibida').waitFor();
const seg = (await page.locator('.bigcode').first().innerText()).trim();
assert.match(seg, /^SEG-[A-Z0-9]{6}$/);
await page.getByLabel('Número de seguimiento').fill(seg);
await page.getByRole('button', { name: 'Consultar' }).click();
await page.getByText('Próximos pasos').waitFor();
await shot('05-seguimiento');

// 3) Operador
await page.getByRole('button', { name: 'Acceso operador/a' }).click();
await page.getByLabel('Usuario').fill('operador.demo');
await page.getByLabel('Clave').fill('mala');
await page.getByRole('button', { name: /Ingresar a la bandeja/ }).click();
await page.getByText('Usuario o clave incorrectos').waitFor();
await page.getByLabel('Clave').fill('demo-2026');
await page.getByRole('button', { name: /Ingresar a la bandeja/ }).click();
await page.getByRole('table').waitFor();
await shot('06-bandeja');
await page.locator('#f-origen').selectOption('prueba');
await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1);
await page.getByRole('button', { name: /Abrir legajo/ }).click();
await page.getByText('Gestión del operador/a').waitFor();
await page.locator('#resp').selectOption('Operador/a Demo 1');
await page.getByRole('button', { name: 'Guardar estado y responsable' }).click();
await page.getByText('Estado y responsable guardados').waitFor();
// derivación sin fundamento → error; con fundamento → ok
await page.locator('#tipo').selectOption('derivacion');
await page.getByRole('button', { name: 'Confirmar resultado' }).click();
await page.getByText(/fundamento es obligatorio/).waitFor();
await page.locator('#fun').fill('Hay indicadores de atención prioritaria; se deriva para evaluación.');
await page.getByRole('button', { name: 'Confirmar resultado' }).click();
await page.getByText('Resultado registrado').waitFor();
await shot('07-detalle');
await page.getByRole('tab', { name: 'Estadísticas' }).click();
await page.getByText('Materias más frecuentes').waitFor();
await shot('08-estadisticas');

// 4) La persona ve el cambio
await page.getByRole('button', { name: 'Acceso ciudadano' }).click();
await page.getByLabel('Número de seguimiento').fill(seg);
await page.getByRole('button', { name: 'Consultar' }).click();
await page.getByText('Derivado a otro organismo').first().waitFor();

// 5) Móvil sin scroll horizontal
const m = await (await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true })).newPage();
await m.goto(APP);
await m.getByRole('button', { name: /Quiero hacer una consulta/ }).click();
await m.getByRole('button', { name: 'Empezar', exact: true }).click();
await m.screenshot({ path: SHOTS + '09-movil.png' });
assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'scroll horizontal en móvil');

assert.deepEqual(errors, [], 'errores de consola: ' + errors.join(' | '));
console.log('E2E OK · seguimiento probado:', seg);
await browser.close();
