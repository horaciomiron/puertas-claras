import { timingSafeEqual, createHash } from 'node:crypto';
import { HttpError } from '../errors.js';
import { createSession } from '../services/sessions.js';
import { validateTriage } from '../services/validation.js';
import { computeStats } from '../services/stats.js';

const h = (s) => createHash('sha256').update(String(s)).digest();
const row = (l, c) => ({
  id: l.id, codigoSeguimiento: l.codigoSeguimiento, creadoEn: l.creadoEn, origen: l.origen,
  materia: l.materia, prioridad: l.prioridad, indicadores: l.indicadores, estado: l.estado,
  estadoLabel: c.gestion.estados[l.estado].label, responsable: l.responsable,
  derivacion: l.derivacionSugerida.nombre, resultado: l.resultado?.tipo || null,
});

export const staffController = ({ repo, config }) => ({
  login: (req, res) => {
    const { usuario, clave } = req.body || {};
    const ok = typeof usuario === 'string' && typeof clave === 'string' &&
      timingSafeEqual(h(usuario), h(config.staff.usuario)) && timingSafeEqual(h(clave), h(config.staff.clave));
    if (!ok) throw new HttpError(401, 'Usuario o clave incorrectos.');
    res.json({ token: createSession({ role: 'operador', usuario }), usuario });
  },

  catalogos: (_req, res) => res.json({
    estados: config.gestion.estados, resultados: config.gestion.resultados, responsables: config.gestion.responsables,
    organismos: config.organismos, materias: config.interview.steps.find((s) => s.id === 'materia').options,
    aviso: config.reglas.aviso,
  }),

  list: async (req, res) => {
    const q = req.query;
    const text = (q.q || '').toString().toLowerCase();
    const rows = await repo.list('legajos', (l) =>
      (!q.estado || l.estado === q.estado) && (!q.materia || l.materia.value === q.materia) &&
      (!q.prioridad || l.prioridad.key === q.prioridad) && (!q.origen || l.origen === q.origen) &&
      (!q.organismo || l.derivacionSugerida.organismoId === q.organismo || l.resultado?.organismoId === q.organismo) &&
      (!q.responsable || (q.responsable === '__none' ? !l.responsable : l.responsable === q.responsable)) &&
      (!q.desde || l.creadoEn.slice(0, 10) >= q.desde) && (!q.hasta || l.creadoEn.slice(0, 10) <= q.hasta) &&
      (!text || l.id.toLowerCase().includes(text) || l.codigoSeguimiento.toLowerCase().includes(text)));
    const order = { inmediata: 0, prioritaria: 1, ordinaria: 2 };
    rows.sort((a, b) => order[a.prioridad.key] - order[b.prioridad.key] || b.creadoEn.localeCompare(a.creadoEn));
    res.json(rows.map((l) => row(l, config)));
  },

  get: async (req, res) => {
    const l = await repo.get('legajos', req.params.id);
    if (!l) throw new HttpError(404, 'No existe ese legajo.');
    res.json(l);
  },

  update: async (req, res) => {
    const l = await repo.get('legajos', req.params.id);
    if (!l) throw new HttpError(404, 'No existe ese legajo.');
    const p = validateTriage(req.body || {}, config);
    const now = new Date().toISOString();
    if (p.resultado && !p.estado) p.estado = config.gestion.resultados[p.resultado.tipo].estado;
    if (p.resultado) p.resultado.registradoEn = now;
    const quien = p.responsable || l.responsable || req.session.usuario;
    const acciones = [];
    if (p.estado && p.estado !== l.estado) acciones.push(`Estado: ${config.gestion.estados[p.estado].label}`);
    if (p.responsable !== undefined && p.responsable !== l.responsable) acciones.push(`Responsable: ${p.responsable || 'sin asignar'}`);
    if (p.resultado) acciones.push(`Resultado: ${config.gestion.resultados[p.resultado.tipo].label}`);
    p.historial = [...l.historial, { en: now, quien, accion: acciones.join(' · ') || 'Actualización' }];
    if (!l.primeraRespuestaEn) p.primeraRespuestaEn = now;
    res.json(await repo.update('legajos', l.id, p));
  },

  stats: async (req, res) => {
    const rows = await repo.list('legajos', (l) => !req.query.origen || l.origen === req.query.origen);
    res.json(computeStats(rows, config));
  },
});
