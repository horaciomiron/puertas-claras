import { HttpError } from '../errors.js';

// Un "paso" es una pantalla; puede tener varios campos (fields). Un "átomo" es una pregunta/campo.
export const atoms = (interview) => interview.steps.flatMap((s) =>
  s.fields ? s.fields.map((f) => ({ ...f, showIf: s.showIf, screen: s.id, etapa: s.etapa })) : [{ ...s, screen: s.id }]);

export function isVisible(step, answers) {
  if (!step.showIf) return true;
  return Object.entries(step.showIf).every(([k, vals]) => {
    const a = answers[k];
    return (Array.isArray(a) ? a : [a]).some((x) => vals.includes(x));
  });
}
const clean = (s) => String(s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();

// partial=true: para borradores (no exige obligatorias)
export function validateAnswers(interview, raw, { partial = false } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    throw new HttpError(400, 'Las respuestas deben ser un objeto.');
  const out = {};
  const errors = [];
  for (const a of atoms(interview)) {
    if (!isVisible(a, out)) continue;
    const v = raw[a.id];
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length);
    if (empty) {
      if (a.required && !partial) errors.push({ campo: a.id, mensaje: 'Falta responder esta pregunta.' });
      continue;
    }
    const values = a.options?.filter((o) => !o.disabled).map((o) => o.value) || [];
    if (a.type === 'single' || a.type === 'select') {
      if (typeof v !== 'string' || !values.includes(v)) { errors.push({ campo: a.id, mensaje: 'Opción no válida.' }); continue; }
      out[a.id] = v;
    } else if (a.type === 'multi') {
      if (!Array.isArray(v) || v.length > 12 || v.some((x) => typeof x !== 'string' || !values.includes(x))) {
        errors.push({ campo: a.id, mensaje: 'Opciones no válidas.' }); continue;
      }
      out[a.id] = [...new Set(v)];
    } else {
      if (typeof v !== 'string') { errors.push({ campo: a.id, mensaje: 'Debe ser texto.' }); continue; }
      const t = clean(v);
      const max = a.maxLength || 200;
      if (t.length > max) { errors.push({ campo: a.id, mensaje: `Máximo ${max} caracteres.` }); continue; }
      if (t) out[a.id] = t;
    }
  }
  if (errors.length) throw new HttpError(400, 'Hay respuestas para corregir.', errors);
  return out;
}

export function validateTriage(body, config) {
  const errors = [];
  const { estados, resultados, responsables } = config.gestion;
  const nombres = responsables.map((r) => r.nombre);
  const r = body.resultado;
  const p = {};
  if (body.estado !== undefined) {
    if (!estados[body.estado]) errors.push({ campo: 'estado', mensaje: 'Estado no válido.' });
    else p.estado = body.estado;
  }
  if (body.responsable !== undefined) {
    if (body.responsable !== '' && !nombres.includes(body.responsable)) errors.push({ campo: 'responsable', mensaje: 'Responsable no válido.' });
    else p.responsable = body.responsable || null;
  }
  if (r !== undefined) {
    if (!r || typeof r !== 'object' || !resultados[r.tipo]) errors.push({ campo: 'resultado.tipo', mensaje: 'Resultado no válido.' });
    else {
      const t = (x, max) => (typeof x === 'string' ? clean(x).slice(0, max) : '');
      const res = { tipo: r.tipo, fundamento: t(r.fundamento, 1000), organismoId: r.organismoId || null,
        proximaActuacion: t(r.proximaActuacion, 300), observaciones: t(r.observaciones, 1000), mensajePersona: t(r.mensajePersona, 500) };
      if (res.fundamento.length < 10) errors.push({ campo: 'resultado.fundamento', mensaje: 'El fundamento es obligatorio (mínimo 10 caracteres).' });
      if (r.tipo === 'derivacion' && !config.organismos.some((o) => o.id === res.organismoId))
        errors.push({ campo: 'resultado.organismoId', mensaje: 'Elegí el organismo receptor.' });
      if (r.tipo !== 'derivacion') res.organismoId = null;
      p.resultado = res;
    }
  }
  if (errors.length) throw new HttpError(400, 'Hay datos para corregir.', errors);
  if (!Object.keys(p).length) throw new HttpError(400, 'No hay cambios para guardar.');
  return p;
}
