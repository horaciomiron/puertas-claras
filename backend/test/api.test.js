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
const respuestas = { entrada: 'nueva', urgencia: 'no', afectada: 'yo', nombre: 'Persona de prueba', seguro: 'si', d_vinculo: 'pareja', ninos: 'no', vulnerabilidades: ['ninguna'],
  tipos_violencia: ['fisica', 'psicologica'], q_fisica: 'si', atencion_medica: 'no', otras_situaciones: 'una', causa_existe: 'si', juzgado_previo: 'JUZ-DEMO-2',
  medida_vigente: 'no', gravedad: ['amenaza_muerte'], medidas: ['acercamiento', 'domicilio'] };

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
  assert.equal((await api('/borrador', { method: 'PUT', token: t, body: { answers: { entrada: 'nueva' }, paso: 1 } })).status, 200);
  const re = await api('/auth/ciudadania', { method: 'POST', body: { codigo: c.body.codigo } });
  assert.equal(re.body.borrador.answers.entrada, 'nueva');
  assert.equal((await api('/legajo/vista-previa', { method: 'POST', token: t, body: { answers: { entrada: 'nueva' } } })).status, 400);
  const pv = await api('/legajo/vista-previa', { method: 'POST', token: t, body: { answers: respuestas } });
  assert.equal(pv.status, 200);
  assert.equal(pv.body.derivacion.requiereValidacionHumana, true);
  assert.equal(pv.body.derivacion.sugeridoId, 'JUZ-DEMO-2'); // antecedente: prevención
  assert.equal(pv.body.derivacion.posiblePrevencion, true);
  assert.equal(pv.body.prioridad.key, 'prioritaria');
  assert.equal(pv.body.medidas.length, 2);
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
  assert.equal((await api(`/legajos/${id}`, { method: 'PATCH', token: ot, body: { resultado: { tipo: 'derivacion', fundamento: 'Corresponde a la defensoría por niñez.', organismoId: 'ORG-DEMO-03' } } })).status, 200);
  assert.equal((await api(`/seguimiento/${s.body.codigoSeguimiento}`)).body.derivada, true);
  assert.equal((await api('/legajos/NO-EXISTE', { token: ot })).status, 404);
});
test('urgencia → prioridad inmediata y orden de bandeja', async () => {
  const o = await api('/auth/operador', { method: 'POST', body: { usuario: 'operador.demo', clave: 'test-clave' } });
  const list = await api('/legajos?origen=demo', { token: o.body.token });
  assert.equal(list.body[0].prioridad.key, 'inmediata');
  const f = await api('/legajos?entrada=existente&origen=demo', { token: o.body.token });
  assert.ok(f.body.length >= 1 && f.body.every((x) => x.entrada === 'existente'));
  const st = await api('/estadisticas', { token: o.body.token });
  assert.ok(st.body.total >= 9);
});
test('turno por fecha y validación de opciones deshabilitadas', async () => {
  const { turnoPorFecha } = await import('../src/services/legajo.js');
  assert.equal(turnoPorFecha(new Date('2026-11-10T15:00:00Z'), config.reglas), 'JUZ-DEMO-2');
  assert.equal(turnoPorFecha(new Date('2026-11-30T15:00:00Z'), config.reglas), 'JUZ-DEMO-5');
  const c = await api('/auth/ciudadania', { method: 'POST', body: {} });
  const r = await api('/legajo/vista-previa', { method: 'POST', token: c.body.token, body: { answers: { ...respuestas, relato_modo: 'audio' } } });
  assert.equal(r.status, 400); // el audio es función futura
});
test('asignar responsable prepara correo y causa existente no pide datos personales', async () => {
  const o = await api('/auth/operador', { method: 'POST', body: { usuario: 'operador.demo', clave: 'test-clave' } });
  const a = await api('/legajos/DEMO-001', { method: 'PATCH', token: o.body.token, body: { responsable: 'Susana' } });
  assert.equal(a.status, 200);
  assert.match(a.body.correo.cuerpo, /Hola Susana/);
  const c = await api('/auth/ciudadania', { method: 'POST', body: {} });
  const ex = await api('/legajo/vista-previa', { method: 'POST', token: c.body.token, body: { entrada: 'existente', answers: { entrada: 'existente', urgencia: 'no', e_accion: 'incumplimiento', e_dni: '0', e_hecho: 'Hecho ficticio' } } });
  assert.equal(ex.status, 200);
  assert.equal(ex.body.prioridad.key, 'prioritaria');
});
