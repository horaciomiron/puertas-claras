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
test('chat: reglas de respaldo en TODA la entrevista, validación y límites', async () => {
  const p = await api('/chat/pasos');
  assert.equal(p.status, 200); assert.equal(p.body.modo, 'reglas');
  const t = (paso, texto) => api('/chat/turno', { method: 'POST', body: { paso, texto } });
  const v = async (paso, texto) => (await t(paso, texto)).body.valores.slice().sort();
  assert.deepEqual(await v('entrada', 'quiero hacer una denuncia nueva'), ['nueva']);
  assert.deepEqual(await v('entrada', 'ya tengo una causa en el juzgado'), ['existente']);
  assert.deepEqual(await v('urgencia', 'fue ayer'), ['no']);
  assert.deepEqual(await v('afectada', 'le pega a mi hermana'), ['otra']);
  assert.deepEqual(await v('afectada_tipo', 'es mi hijo chiquito'), ['nna']);
  assert.deepEqual(await v('seguro', 'mejor por mail'), ['otro']);
  assert.deepEqual(await v('d_vinculo', 'mi ex'), ['expareja']);
  assert.deepEqual(await v('d_convivencia', 'a veces'), ['aveces']);
  assert.deepEqual(await v('ninos', 'tengo dos hijos chicos'), ['si']);
  assert.deepEqual(await v('vulnerabilidades', 'estoy embarazada'), ['embarazo']);
  assert.deepEqual(await v('vulnerabilidades', 'ninguna'), ['ninguna']);
  assert.deepEqual(await v('barreras', 'tengo miedo y no tengo internet'), ['conectividad', 'miedo']);
  assert.deepEqual(await v('tipos_violencia', 'me insulta, me controla el celular y me pega'), ['control', 'digital', 'fisica', 'psicologica']);
  assert.deepEqual(await v('q_fisica', 'si, me empujo'), ['si']);
  assert.deepEqual(await v('atencion_medica', 'no'), ['no']);
  assert.deepEqual(await v('otras_situaciones', 'pasa siempre'), ['varias']);
  assert.deepEqual(await v('causa_existe', 'no se'), ['nose']);
  assert.deepEqual(await v('juzgado_previo', 'el juzgado 3'), ['JUZ-DEMO-3']);
  assert.deepEqual(await v('medida_vigente', 'si'), ['si']);
  assert.deepEqual(await v('gravedad', 'me amenazo de muerte y tiene un arma'.replace('tiene un arma', 'usa pistola')), ['amenaza_muerte', 'amenazas', 'arma']);
  assert.deepEqual(await v('gravedad', 'no hubo nada de eso'), ['ninguna']);
  assert.deepEqual(await v('medidas', 'que no se acerque y que no me llame'), ['acercamiento', 'comunicacion']);
  assert.deepEqual(await v('relato_modo', 'prefiero seguir con las preguntas'), ['seguir']);
  assert.deepEqual(await v('e_accion', 'se acerco, incumplio la medida'), ['incumplimiento']);
  assert.equal((await t('afectada', 'blablabla')).body.entendido, false);
  assert.equal((await t('entrada', 'me va a matar, está acá')).body.emergencia, true);
  assert.equal((await t('nombre', 'Maria')).status, 400); // texto libre: nunca se interpreta (ni va a IA)
  assert.equal((await t('inexistente', 'hola')).status, 400);
  assert.equal((await t('entrada', '')).status, 400);
  assert.equal((await t('entrada', 'x'.repeat(501))).status, 400);
});
test('chat con IA: descarta valores inventados, respeta excluyentes y la emergencia no pasa por la IA', async () => {
  const { interpretar } = await import('../src/services/chat.js');
  const env = { GEMINI_API_KEY: 'fake' };
  const r = await interpretar({ pasoId: 'tipos_violencia', texto: 'me golpea', config, env, ia: async () => ['fisica', 'inventado'] });
  assert.deepEqual(r.valores, ['fisica']); assert.equal(r.via, 'ia');
  const x = await interpretar({ pasoId: 'gravedad', texto: 'x', config, env, ia: async () => ['ninguna', 'arma'] });
  assert.deepEqual(x.valores, ['arma']); // "ninguna" no convive con otras
  let llamada = false;
  const e = await interpretar({ pasoId: 'urgencia', texto: 'socorro, me va a matar', config, env, ia: async () => { llamada = true; return ['no']; } });
  assert.equal(e.emergencia, true); assert.equal(llamada, false);
  const f = await interpretar({ pasoId: 'ninos', texto: 'tengo una hija', config, env, ia: async () => { throw new Error('caída'); } });
  assert.deepEqual(f.valores, ['si']); assert.equal(f.via, 'reglas');
});
test('Clara: explicaciones de respaldo, emergencia, límites y IA simulada', async () => {
  const info = await api('/ayuda'); assert.equal(info.body.nombre, 'Clara'); assert.equal(info.body.modo, 'reglas');
  const q = (paso, mensaje) => api('/ayuda', { method: 'POST', body: { paso, mensaje } });
  const a = await q('medidas', ''); assert.equal(a.status, 200); assert.match(a.body.respuesta, /medida de protección/i); assert.equal(a.body.via, 'reglas');
  assert.match((await q('datos', 'para qué sirve el DNI')).body.respuesta, /opcional/i);
  assert.match((await q('revision', 'qué pasa después de enviar')).body.respuesta, /seguimiento/i);
  assert.ok((await q('paso_raro', 'no entiendo')).body.respuesta.length > 20); // paso desconocido: no falla
  const em = await q('urgencia', 'me va a matar, está acá'); assert.equal(em.body.emergencia, true); assert.match(em.body.respuesta, /911/);
  assert.equal((await q('medidas', 'x'.repeat(301))).status, 400);
  assert.equal((await q('medidas', 123)).status, 400);
  const { responder } = await import('../src/services/ayuda.js');
  const env = { GEMINI_API_KEY: 'fake' };
  let visto = '';
  const ok = await responder({ pasoId: 'medidas', mensaje: 'explicame', config, env, ia: async (paso, m) => { visto = paso.label + '|' + m; return 'Respuesta de IA'; } });
  assert.equal(ok.via, 'ia'); assert.match(visto, /medida de protección/); // la IA recibe la pregunta, nunca respuestas ni datos
  let llamada = false;
  const e2 = await responder({ pasoId: 'medidas', mensaje: 'socorro', config, env, ia: async () => { llamada = true; return 'x'; } });
  assert.equal(e2.emergencia, true); assert.equal(llamada, false);
  const caida = await responder({ pasoId: 'medidas', mensaje: 'explicame', config, env, ia: async () => { throw new Error('caída'); } });
  assert.equal(caida.via, 'reglas'); assert.ok(caida.respuesta.length > 20);
});
