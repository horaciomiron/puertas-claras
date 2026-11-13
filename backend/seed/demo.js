// Casos 100% FICTICIOS para demostración (origen: 'demo'). Todos son de violencia familiar y de género.
import { validateAnswers } from '../src/services/validation.js';
import { buildLegajo, armarCorreo } from '../src/services/legajo.js';

const N = { entrada: 'nueva', urgencia: 'no', afectada: 'yo', nombre: 'Caso demo', seguro: 'si', telefono: '000-0000', d_nombre: 'Persona denunciada demo', d_vinculo: 'expareja',
  d_domicilio: 'Calle Ficticia 123', d_trabajo: 'Lugar ficticio', ninos: 'no', vulnerabilidades: ['ninguna'], tipos_violencia: ['psicologica'], otras_situaciones: 'no',
  causa_existe: 'no', medida_vigente: 'no', gravedad: ['ninguna'], medidas: ['ninguna'], relato_modo: 'escribir', relato: 'Relato sintético para demostración.' };
const X = { entrada: 'existente', urgencia: 'no', e_dni: '00.000.000 (ficticio)' };
const R = (tipo, fundamento, extra = {}) => ({ tipo, fundamento, organismoId: null, proximaActuacion: '', observaciones: '', mensajePersona: '', ...extra });

export const CASOS = [
  { h: 1, estado: 'recibido', a: { ...N, nombre: 'Caso demo A', tipos_violencia: ['psicologica', 'digital'], q_psico: 'si', q_digital: 'si', medidas: ['acercamiento', 'comunicacion'] } },
  { h: 3, estado: 'recibido', a: { ...N, entrada: 'emergencia', nombre: 'Caso demo B (urgente)', tipos_violencia: ['fisica'], q_fisica: 'si', atencion_medica: 'si', gravedad: ['amenaza_muerte', 'escalada'], medidas: ['acercamiento', 'domicilio'] } },
  { h: 26, estado: 'intervencion', resp: 'Flor', res: R('intervencion_judicial', 'Hay indicadores de atención prioritaria y antecedente; corresponde evaluación judicial (demo).', { proximaActuacion: 'Elevar al juzgado que previno.' }),
    a: { ...N, nombre: 'Caso demo C', tipos_violencia: ['incumplimiento', 'amenazas'], otras_situaciones: 'varias', causa_existe: 'si', expediente: 'EXP-DEMO-24 (ficticio)', juzgado_previo: 'JUZ-DEMO-4', medida_vigente: 'si', medida_incumplida: 'si', gravedad: ['arma'], medidas: ['exclusion', 'acercamiento'] } },
  { h: 30, estado: 'derivado', resp: 'Caro', res: R('derivacion', 'Hay niñez involucrada; corresponde intervención de la Defensoría (demo).', { organismoId: 'ORG-DEMO-03', mensajePersona: 'Tu consulta fue enviada a la Defensoría de Niñez (demo).' }),
    a: { ...N, nombre: 'Caso demo D', afectada: 'otra', afectada_tipo: 'nna', ninos: 'si', n_edad: '8', tipos_violencia: ['psicologica'], medidas: ['hijos'] } },
  { h: 50, estado: 'orientado', resp: 'Susana', res: R('orientacion', 'Se explicó cómo realizar la presentación y qué medidas existen (demo).', { mensajePersona: 'Te explicamos los pasos y las medidas posibles.' }),
    a: { ...N, nombre: 'Caso demo E', afectada: 'otra', afectada_tipo: 'discapacidad', vulnerabilidades: ['discapacidad'], tipos_violencia: ['economica'], q_economica: 'si', barreras: ['lectura'], medidas: ['no_se'] } },
  { h: 52, estado: 'en_revision', resp: 'Flor', a: { ...N, nombre: 'Caso demo F', afectada: 'otra', afectada_tipo: 'adulta_mayor', tipos_violencia: ['fisica'], q_fisica: 'si', atencion_medica: 'nose', barreras: ['conectividad', 'distancia'], medidas: ['acercamiento'] } },
  { h: 70, estado: 'recibido', a: { ...N, nombre: 'Caso demo G', tipos_violencia: ['no_sabe'], barreras: ['lectura', 'miedo'], medidas: ['no_se'], relato_modo: 'seguir', relato: undefined } },
  { h: 75, estado: 'info_adicional', resp: 'Caro', res: R('info_adicional', 'Falta precisar fechas del hecho nuevo informado (demo).', { mensajePersona: 'Necesitamos que nos cuentes cuándo ocurrió el hecho.' }),
    a: { ...X, e_accion: 'hecho_nuevo', e_expediente: 'EXP-DEMO-31 (ficticio)', e_juzgado: 'nose', e_hecho: 'Hecho nuevo ficticio para demostración.', e_gravedad: ['amenazas'], e_medidas: ['comunicacion'] } },
  { h: 100, estado: 'sin_intervencion', resp: 'Susana', res: R('sin_intervencion', 'Solo se actualizaron datos de contacto; no hay hecho nuevo (demo).', { mensajePersona: 'Actualizamos tus datos. No hay novedades para evaluar.' }),
    a: { ...X, e_accion: 'actualizar', e_telefono: '000-1111', e_seguro: 'si' } },
];

export function buildDemoLegajos(config) {
  const now = Date.now();
  return CASOS.map((c, i) => {
    const answers = validateAnswers(config.interview, c.a);
    const fecha = new Date(now - c.h * 36e5);
    const resp = c.estado === 'recibido' ? null : new Date(now - (c.h - 2) * 36e5).toISOString();
    const base = {
      id: `DEMO-${String(i + 1).padStart(3, '0')}`, esquema: 2, codigoSeguimiento: `SEG-DEMO${String(i + 1).padStart(2, '0')}`,
      creadoEn: fecha.toISOString(), origen: 'demo', ...buildLegajo(answers, config, fecha),
      estado: c.estado, responsable: c.resp || null, resultado: c.res ? { ...c.res, registradoEn: resp } : null, primeraRespuestaEn: resp,
      historial: [{ en: fecha.toISOString(), quien: 'Sistema', accion: 'Presentación recibida' }, ...(resp ? [{ en: resp, quien: c.resp, accion: 'Gestión registrada' }] : [])],
    };
    if (c.resp) { const r = config.gestion.responsables.find((x) => x.nombre === c.resp); base.correo = armarCorreo(base, r.nombre, r.email); }
    return base;
  });
}
