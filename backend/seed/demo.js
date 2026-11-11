// Casos 100% FICTICIOS para demostración (origen: 'demo'). Cubren los escenarios de prueba.
import { validateAnswers } from '../src/services/validation.js';
import { buildLegajo } from '../src/services/legajo.js';

const base = { urgencia: 'no', afectada: 'yo', vulnerabilidades: ['ninguna'], barreras: ['ninguna'], antecedentes: 'ninguno', pedido: ['orientacion'], contacto_medio: 'no_contactar' };
const R = (tipo, fundamento, extra = {}) => ({ tipo, fundamento, organismoId: null, proximaActuacion: '', observaciones: '', mensajePersona: '', ...extra });

export const CASOS = [
  { h: 1, estado: 'recibido', a: { ...base, materia: 'consumo', relato: 'Caso ficticio: compré un producto que no funciona y la empresa no responde.' } },
  { h: 3, estado: 'recibido', a: { ...base, urgencia: 'si', materia: 'violencia', violencia_gravedad: ['amenaza_muerte', 'escalada'], medida_incumplida: 'no', pedido: ['proteccion'], barreras: ['miedo'], alias: 'Caso demo urgente' } },
  { h: 26, estado: 'intervencion', resp: 'Operador/a Demo 1', res: R('intervencion_judicial', 'Hay indicadores de atención prioritaria; corresponde análisis judicial (demo).', { proximaActuacion: 'Elevar al juzgado demo para su evaluación.' }),
    a: { ...base, materia: 'violencia', violencia_gravedad: ['arma'], medida_incumplida: 'si', pedido: ['proteccion', 'informar_novedad'], antecedentes: 'causa', expediente: 'EXP-DEMO-24 (ficticio)' } },
  { h: 30, estado: 'derivado', resp: 'Operador/a Demo 2', res: R('derivacion', 'El tema es de vivienda; corresponde al servicio administrativo demo.', { organismoId: 'ORG-DEMO-04', mensajePersona: 'Tu consulta fue enviada al servicio de vivienda demo.' }),
    a: { ...base, materia: 'vivienda', barreras: ['distancia', 'economia'], pedido: ['iniciar_tramite'], relato: 'Caso ficticio: aviso de desalojo del propietario.' } },
  { h: 50, estado: 'orientado', resp: 'Operador/a Demo 3', res: R('orientacion', 'Se brindó información sobre trámite de certificado (demo).', { mensajePersona: 'Te explicamos cómo tramitar el certificado de discapacidad.' }),
    a: { ...base, afectada: 'otra_persona', materia: 'discapacidad', vulnerabilidades: ['discapacidad'], barreras: ['lectura'], pedido: ['orientacion'] } },
  { h: 52, estado: 'en_revision', resp: 'Operador/a Demo 1', a: { ...base, materia: 'salud', vulnerabilidades: ['adulta_mayor'], barreras: ['conectividad', 'distancia'], pedido: ['orientacion'], relato: 'Caso ficticio: demora para una cirugía.' } },
  { h: 70, estado: 'recibido', a: { ...base, materia: 'no_se', barreras: ['lectura', 'miedo'], pedido: ['no_se'], relato: 'No sé a dónde ir ni qué corresponde (caso ficticio).' } },
  { h: 75, estado: 'info_adicional', resp: 'Operador/a Demo 2', res: R('info_adicional', 'Falta precisar fechas y documentos del conflicto laboral (demo).', { mensajePersona: 'Necesitamos que nos cuentes desde cuándo ocurre y si tenés recibos.' }),
    a: { ...base, materia: 'trabajo', pedido: ['iniciar_tramite'], relato: 'Caso ficticio: despido sin pago.' } },
  { h: 100, estado: 'sin_intervencion', resp: 'Operador/a Demo 3', res: R('sin_intervencion', 'Conflicto de convivencia sin hechos que requieran intervención por ahora; se explicó mediación (demo).', { mensajePersona: 'Por ahora no hay intervención. Podés pedir que se revise si la situación cambia.' }),
    a: { ...base, materia: 'vecinal', pedido: ['informacion'] } },
];

export function buildDemoLegajos(config) {
  const now = Date.now();
  return CASOS.map((c, i) => {
    const answers = validateAnswers(config.interview, c.a);
    const creado = new Date(now - c.h * 36e5).toISOString();
    const resp = c.estado === 'recibido' ? null : new Date(now - (c.h - 2) * 36e5).toISOString();
    return {
      id: `DEMO-${String(i + 1).padStart(3, '0')}`, codigoSeguimiento: `SEG-DEMO${String(i + 1).padStart(2, '0')}`,
      creadoEn: creado, origen: 'demo', ...buildLegajo(answers, config),
      estado: c.estado, responsable: c.resp || null, resultado: c.res ? { ...c.res, registradoEn: resp } : null, primeraRespuestaEn: resp,
      historial: [{ en: creado, quien: 'Sistema', accion: 'Presentación recibida' }, ...(resp ? [{ en: resp, quien: c.resp, accion: 'Gestión registrada' }] : [])],
    };
  });
}
