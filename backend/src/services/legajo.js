import { isVisible } from './validation.js';

const labelOf = (step, v) => step.options?.find((o) => o.value === v)?.label ?? v;

// Construye el "legajo inteligente": resumen ordenado + indicadores + derivación SUGERIDA.
// La prioridad solo ordena la revisión: no es una evaluación de riesgo ni una decisión jurídica.
export function buildLegajo(answers, config) {
  const { interview, reglas, organismos } = config;
  const ind = new Set();
  const secciones = [];
  for (const s of interview.steps.filter((x) => isVisible(x, answers))) {
    const v = answers[s.id];
    if (v === undefined) continue;
    const vals = Array.isArray(v) ? v : [v];
    for (const x of vals) { const o = s.options?.find((o) => o.value === x); if (o?.indicador) ind.add(o.indicador); }
    secciones.push({ stepId: s.id, etapa: s.etapa, pregunta: s.label.replace(' (opcional)', ''),
      respuesta: s.options ? vals.map((x) => labelOf(s, x)).join(' · ') : String(v) });
  }
  const indicadores = [...ind].map((id) => ({ id, label: reglas.etiquetasIndicadores[id] || id }));
  const key = reglas.prioridad.inmediata.some((i) => ind.has(i)) ? 'inmediata'
    : reglas.prioridad.prioritaria.some((i) => ind.has(i)) ? 'prioritaria' : 'ordinaria';
  const prioridad = { key, label: { inmediata: 'Inmediata', prioritaria: 'Prioritaria', ordinaria: 'Ordinaria' }[key] };

  const ids = reglas.materias[answers.materia] || [reglas.porDefecto];
  const org = organismos.find((o) => o.id === ids[0]);
  let motivo = answers.materia === 'no_se'
    ? 'La persona no supo clasificar el tema: orientar desde la mesa general.'
    : 'Competencia material de demostración según el tema indicado.';
  if (answers.antecedentes === 'causa') motivo += ' Hay antecedente informado: verificar prevención/conexidad antes de derivar.';
  const materiaStep = interview.steps.find((s) => s.id === 'materia');
  const materia = { value: answers.materia, label: labelOf(materiaStep, answers.materia) };
  const afectadaStep = interview.steps.find((s) => s.id === 'afectada');
  const necesidades = (answers.pedido || []).map((x) => labelOf(interview.steps.find((s) => s.id === 'pedido'), x));

  return {
    answers, secciones, indicadores, prioridad, materia, necesidades,
    barreras: (answers.barreras || []).filter((b) => b !== 'ninguna'),
    resumen: `Consulta sobre «${materia.label}». Afecta a: ${labelOf(afectadaStep, answers.afectada).toLowerCase()}. ` +
      `Necesita: ${necesidades.join('; ') || 'sin especificar'}. Prioridad de revisión: ${prioridad.label} (orientativa, no es una evaluación de riesgo).`,
    derivacionSugerida: { organismoId: org.id, nombre: org.nombre, alternativas: ids.slice(1), motivo, requiereValidacionHumana: true },
  };
}

export function publicLegajo(l) {
  const { answers, ...rest } = l; // eslint-disable-line no-unused-vars
  return rest;
}
