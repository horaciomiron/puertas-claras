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

const pick = (t) => page.locator('label.choice', { hasText: t }).first();
const sel = (id, v) => async () => page.locator('#' + id).selectOption(v);
const fill = (id, v) => async () => page.locator('#' + id).fill(v);
const flujoNueva = [
  ['¿Necesitás denunciar', 'Necesito ayuda porque hay una emergencia'], ['¿La situación de violencia te ocurrió', 'Sí'],
  ['Tus datos de contacto', async () => { await fill('nombre', 'Persona Ficticia')(); await sel('seguro', 'si')(); }],
  ['Datos de la persona denunciada', sel('d_vinculo', 'expareja')], ['¿Hay niños', 'No'], ['¿Hay alguna persona', 'Ninguna'],
  ['¿Qué tipo de violencia', 'Violencia física'], ['¿Hubo golpes', 'Sí'], ['¿Necesitás atención médica', 'No'],
  ['¿Hubo otras situaciones', 'Sí, varias veces'], ['¿Ya existe una causa', 'Sí'], ['Datos de la causa anterior', sel('juzgado_previo', 'JUZ-DEMO-3')],
  ['¿Existe alguna medida', 'No'], ['¿Pasó alguna', 'Hubo amenazas de muerte'], ['¿Necesitás pedir alguna medida', 'Que no se acerque a mí'],
  ['¿Querés contar', 'Prefiero continuar'],
];
const flujoExistente = [
  ['¿Necesitás denunciar', 'Ya tengo una causa'], ['¿La situación de violencia está ocurriendo', 'No'], ['¿Qué necesitás hacer', 'Informar un incumplimiento'],
  ['Datos para encontrar tu causa', fill('e_dni', '00.000.000 ficticio')], ['Contanos qué querés', async () => page.locator('textarea').fill('Hecho nuevo ficticio.')],
];
async function runInterview(flujo, { onEmergency } = {}) {
  await page.getByRole('button', { name: 'Empezar', exact: true }).click();
  for (let i = 0; i < 40; i++) {
    const q = await page.locator('fieldset.q h2').innerText();
    if (process.env.DBG) console.log('Q:', q);
    const hit = flujo.find(([k]) => q.startsWith(k));
    if (hit) { typeof hit[1] === 'string' ? await pick(hit[1]).click() : await hit[1](); }
    const btn = page.locator('.nav .primary');
    const label = await btn.innerText();
    await btn.click();
    if (hit && typeof hit[1] === 'string' && hit[1].includes('emergencia')) {
      await page.locator('.emergency').waitFor(); // aparece antes de pedir datos
      assert.match(await page.locator('.emergency').innerText(), /911/);
      await shot('02-emergencia');
      await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    }
    if (label.startsWith('Revisar')) break;
    await page.waitForFunction((old) => document.querySelector('fieldset.q h2')?.innerText !== old, q);
  }
  try { await page.getByRole('heading', { name: 'Revisá tu legajo' }).waitFor({ timeout: 8000 }); }
  catch (e) { console.log('PANTALLA:', (await page.locator('main').innerText()).slice(0, 600)); throw e; }
}

await page.goto(APP);
await page.getByRole('heading', { name: /Una puerta más clara/ }).waitFor();
await shot('01-caratula');

// 1) Ciudadanía: validación de pregunta obligatoria
await page.getByRole('button', { name: /Necesito denunciar o informar/ }).click();
await page.getByRole('button', { name: 'Empezar', exact: true }).click();
await page.locator('.nav .primary').click();
await page.getByText('Falta responder esta pregunta').waitFor();
await page.goto(APP); await page.getByRole('button', { name: /Necesito denunciar o informar/ }).click();

// 2) Denuncia nueva por emergencia → legajo → envío
await runInterview(flujoNueva);
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

// 2b) Causa existente
await page.getByRole('button', { name: 'Volver al inicio' }).click();
await runInterview(flujoExistente);
assert.match(await page.locator('.summary').innerText(), /Causa existente/);
await page.getByLabel(/acepto el aviso de privacidad/).check();
await page.getByRole('button', { name: /Enviar consulta/ }).click();
await page.getByText('Tu consulta (simulada) fue recibida').waitFor();

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
await page.locator('#f-entrada').selectOption('nueva');
await page.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1);
await page.getByRole('button', { name: /Abrir legajo/ }).click();
await page.getByText('Datos para notificación').waitFor();
const det = await page.locator('.detail').innerText();
for (const t of ['Prioridad de revisión', 'Medidas solicitadas', 'Que no se acerque a mí', 'Juzgado N.º 3 (demo)', 'validación pendiente', 'Violencia física']) assert.ok(det.includes(t), 'falta en detalle: ' + t);
await page.getByRole('button', { name: 'Flor', exact: true }).click();
await page.getByText('Asignado a Flor').waitFor();
assert.match(await page.locator('.mailcard').innerText(), /Hola Flor/);
await page.locator('#tipo').selectOption('derivacion');
await page.getByRole('button', { name: /Confirmar resultado/ }).click();
await page.getByText(/fundamento es obligatorio/).waitFor();
await page.locator('#fun').fill('Hay indicadores de atención prioritaria; se deriva para evaluación.');
await page.getByRole('button', { name: /Confirmar resultado/ }).click();
await page.getByText('Resultado registrado').waitFor();
await shot('07-detalle');
await page.getByRole('tab', { name: 'Estadísticas' }).click();
await page.getByText('Medidas solicitadas').first().waitFor();
await shot('08-estadisticas');

// 4) La persona ve el cambio
await page.getByRole('button', { name: 'Acceso ciudadano' }).click();
await page.getByLabel('Número de seguimiento').fill(seg);
await page.getByRole('button', { name: 'Consultar' }).click();
await page.getByText('Derivado a otro organismo').first().waitFor();

// 5) Móvil sin scroll horizontal
const m = await (await browser.newContext({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2, isMobile: true })).newPage();
await m.goto(APP);
await m.getByRole('button', { name: /Necesito denunciar o informar/ }).click();
await m.getByRole('button', { name: 'Empezar', exact: true }).click();
await m.screenshot({ path: SHOTS + '09-movil.png' });
assert.ok(await m.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'scroll horizontal en móvil');

assert.deepEqual(errors, [], 'errores de consola: ' + errors.join(' | '));
console.log('E2E OK · seguimiento probado:', seg);
await browser.close();
