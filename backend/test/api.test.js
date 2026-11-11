import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { FileRepo } from '../src/repo/fileRepo.js';
import { buildDemoLegajos } from '../seed/demo.js';

let server, base, dir;
const config = loadConfig({ STAFF_PASSWORD: 'test-clave' });
const api = async (p, { method = 'GET', body, token, raw } = {}) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: raw ?? (body ? JSON.stringify(body) : undefined) });
  return { status: r.status, body: await r.json() };
};
const respuestas = { urgencia: 'no', materia: 'vivienda', afectada: 'yo', vulnerabilidades: ['ninguna'], barreras: ['distancia'], antecedentes: 'ninguno', pedido: ['orientacion'], contacto_medio: 'no_contactar' };

before(async () => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pc-'));
  const repo = new FileRepo(dir);
  for (const l of buildDemoLegajos(config)) await repo.insertWith('legajos', () => l);
  await new Promise((ok) => { server = createApp({ repo, config }).listen(0, ok); });
  base = `http://localhost:${server.address().port}/api`;
});
after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

test('health y entrevista públicas', async () => {
  assert.equal((await api('/health')).body.ok, true);
  assert.ok((await api('/entrevista')).body.steps.length > 5);
});
test('404 y JSON inválido devuelven JSON', async () => {
  assert.equal((await api('/nada')).status, 404);
  const r = await api('/auth/operador', { method: 'POST', raw: '{mal' });
  assert.equal(r.status, 400);
  assert.ok(r.body.error);
});
test('rutas protegidas: 401 sin token y 403 con rol equivocado', async () => {
  assert.equal((await api('/legajos')).status, 401);
  const c = await api('/auth/ciudadania', { method: 'POST', body: {} });
  assert.equal((await api('/legajos', { token: c.body.token })).status, 403);
});
test('login operador: clave incorrecta 401', async () => {
  assert.equal((await api('/auth/operador', { method: 'POST', body: { usuario: 'operador.demo', clave: 'x' } })).status, 401);
});
test('flujo completo: borrador → vista previa → envío → seguimiento → gestión', async () => {
  const c = await api('/auth/ciudadania', { method: 'POST', body: {} });
  assert.match(c.body.codigo, /^PC-[A-Z0-9]{6}$/);
  const t = c.body.token;
  assert.equal((await api('/borrador', { method: 'PUT', token: t, body: { answers: { materia: 'vivienda' }, paso: 1 } })).status, 200);
  const re = await api('/auth/ciudadania', { method: 'POST', body: { codigo: c.body.codigo } });
  assert.equal(re.body.borrador.answers.materia, 'vivienda');
  assert.equal((await api('/legajo/vista-previa', { method: 'POST', token: t, body: { answers: { materia: 'vivienda' } } })).status, 400);
  const pv = await api('/legajo/vista-previa', { method: 'POST', token: t, body: { answers: respuestas } });
  assert.equal(pv.status, 200);
  assert.equal(pv.body.derivacionSugerida.requiereValidacionHumana, true);
  assert.equal((await api('/presentaciones', { method: 'POST', token: t, body: { answers: respuestas } })).status, 400); // sin consentimiento
  const s = await api('/presentaciones', { method: 'POST', token: t, body: { answers: respuestas, consentimiento: true } });
  assert.equal(s.status, 201);
  const seg = await api(`/seguimiento/${s.body.codigoSeguimiento}`);
  assert.equal(seg.body.estado, 'Recibido');
  assert.equal((await api('/seguimiento/SEG-NOEXIS')).status, 404);

  const o = await api('/auth/operador', { method: 'POST', body: { usuario: 'operador.demo', clave: 'test-clave' } });
  const ot = o.body.token;
  const id = s.body.legajo.id;
  assert.equal((await api(`/legajos/${id}`, { method: 'PATCH', token: ot, body: { resultado: { tipo: 'derivacion', fundamento: 'corto' } } })).status, 400);
  assert.equal((await api(`/legajos/${id}`, { method: 'PATCH', token: ot, body: { resultado: { tipo: 'derivacion', fundamento: 'Corresponde al servicio de vivienda.', organismoId: 'ORG-DEMO-04' } } })).status, 200);
  assert.equal((await api(`/seguimiento/${s.body.codigoSeguimiento}`)).body.derivada, true);
  assert.equal((await api('/legajos/NO-EXISTE', { token: ot })).status, 404);
});
test('urgencia → prioridad inmediata y orden de bandeja', async () => {
  const o = await api('/auth/operador', { method: 'POST', body: { usuario: 'operador.demo', clave: 'test-clave' } });
  const list = await api('/legajos?origen=demo', { token: o.body.token });
  assert.equal(list.body[0].prioridad.key, 'inmediata');
  const f = await api('/legajos?materia=vivienda&origen=demo', { token: o.body.token });
  assert.ok(f.body.length >= 1 && f.body.every((x) => x.materia.value === 'vivienda'));
  const st = await api('/estadisticas', { token: o.body.token });
  assert.ok(st.body.total >= 9);
});
test('el legajo público no contiene datos sensibles de más (sin DNI ni domicilio)', async () => {
  const keys = JSON.stringify(config.interview.steps.map((s) => s.id));
  assert.doesNotMatch(keys, /dni|domicilio|direccion/i);
});
