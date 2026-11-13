import { isVisible, atoms } from './validation.js';

const ENTRADA = { nueva: 'Denuncia nueva', existente: 'Causa existente', emergencia: 'Denuncia nueva (por emergencia)' };

export function turnoPorFecha(fecha, reglas) {
  const dia = Number(new Intl.DateTimeFormat('en-CA', { timeZone: reglas.turnos.zona, day: 'numeric' }).format(fecha));
  return reglas.turnos.rangos.find((r) => dia <= r.hastaDia).juzgado;
}

// Derivación SUGERIDA: fecha de ingreso → juzgado de turno → antecedente → posible prevención/conexidad.
// Siempre queda pendiente la validación del operador.
export function sugerirDerivacion(answers, config, fecha) {
  const nombre = (id) => config.organismos.find((o) => o.id === id)?.nombre || null;
  const turnoId = turnoPorFecha(fecha, config.reglas);
  const existe = answers.entrada === 'existente' ? 'si' : answers.causa_existe || 'nose';
  const prev = answers.juzgado_previo || answers.e_juzgado;
  const previoId = prev && prev.startsWith('JUZ-') ? prev : null;
  const prevencion = existe === 'si';
  const sugeridoId = previoId || turnoId;
  let motivo = previoId
    ? 'Antecedente judicial informado: posible prevención/conexidad con el juzgado que intervino antes.'
    : 'Juzgado de turno según la fecha de ingreso.';
  if (prevencion && !previoId) motivo += ' Se informó una causa previa sin identificar el juzgado: verificar prevención/conexidad antes de derivar.';
  return {
    fechaIngreso: fecha.toISOString(), turnoId, turno: nombre(turnoId),
    antecedente: { existe, juzgadoPrevioId: previoId, juzgadoPrevio: previoId ? nombre(previoId) : null, expediente: answers.expediente || answers.e_expediente || null },
    posiblePrevencion: prevencion, requiereVerificar: prevencion && !previoId,
    sugeridoId, sugerido: nombre(sugeridoId), motivo, validacionPendiente: true, requiereValidacionHumana: true,
  };
}

// Construye el "legajo inteligente". La prioridad solo ordena la revisión: no es evaluación de riesgo.
export function buildLegajo(answers, config, fecha = new Date()) {
  const { interview, reglas } = config;
  const all = atoms(interview);
  const byId = Object.fromEntries(all.map((a) => [a.id, a]));
  const lab = (id, v) => byId[id]?.options?.find((o) => o.value === v)?.label ?? v;
  const arr = (id) => (Array.isArray(answers[id]) ? answers[id] : answers[id] ? [answers[id]] : []);
  const labs = (id) => arr(id).map((v) => lab(id, v));
  const kv = (k, v) => { const s = Array.isArray(v) ? v.join(' · ') : v; return s ? { k, v: s } : null; };
  const ok = (xs) => xs.filter(Boolean);

  const ind = new Set();
  const secciones = [];
  for (const a of all.filter((x) => isVisible(x, answers))) {
    const v = answers[a.id];
    if (v === undefined) continue;
    for (const x of arr(a.id)) { const o = a.options?.find((o) => o.value === x); if (o?.indicador) ind.add(o.indicador); }
    secciones.push({ stepId: a.screen, etapa: a.etapa, pregunta: a.label.replace(' (opcional)', ''),
      respuesta: a.options ? labs(a.id).join(' · ') : String(v) });
  }
  const indicadores = [...ind].map((id) => ({ id, label: reglas.etiquetasIndicadores[id] || id }));
  const key = reglas.prioridad.inmediata.some((i) => ind.has(i)) ? 'inmediata'
    : reglas.prioridad.prioritaria.some((i) => ind.has(i)) ? 'prioritaria' : 'ordinaria';
  const prioridad = { key, label: { inmediata: 'Inmediata', prioritaria: 'Prioritaria', ordinaria: 'Ordinaria' }[key] };

  const existente = answers.entrada === 'existente';
  const tipos = existente ? labs('e_accion') : labs('tipos_violencia');
  const medidas = [...labs('medidas'), ...labs('e_medidas')].filter((m) => !/^Ninguna/.test(m));
  const derivacion = sugerirDerivacion(answers, config, fecha);

  const detalle = ['q_fisica', 'q_psico', 'q_economica', 'q_digital', 'q_sexual']
    .filter((id) => answers[id]).map((id) => `${byId[id].label} ${lab(id, answers[id])}`);
  const datosBasicos = existente
    ? ok([kv('Tipo de ingreso', ENTRADA.existente), kv('Qué necesita', labs('e_accion')), kv('DNI o identificación', answers.e_dni),
        kv('Expediente', answers.e_expediente), kv('Teléfono nuevo', answers.e_telefono), kv('Domicilio nuevo', answers.e_domicilio),
        kv('Contacto seguro', labs('e_seguro'))])
    : ok([kv('Tipo de ingreso', ENTRADA[answers.entrada]),
        kv('Persona afectada', answers.afectada === 'yo' ? 'La persona que realiza la presentación' : labs('afectada_tipo')),
        kv('Nombre y apellido', answers.nombre), kv('DNI', answers.dni), kv('Teléfono', answers.telefono), kv('Contacto seguro', labs('seguro')),
        kv('Persona denunciada', answers.d_nombre || 'No informado'), kv('Vínculo', labs('d_vinculo')), kv('Conviven', labs('d_convivencia'))]);
  const situacion = existente
    ? ok([kv('Qué informa', labs('e_accion')), kv('Indicadores informados', labs('e_gravedad'))])
    : ok([kv('Tipos de violencia', tipos), kv('Detalles', detalle), kv('Atención médica', labs('atencion_medica')),
        kv('Niños/as o adolescentes', [...labs('ninos'), answers.n_edad && `edad: ${answers.n_edad}`, answers.n_relacion && `relación: ${answers.n_relacion}`].filter(Boolean)),
        kv('Vulnerabilidades', labs('vulnerabilidades').filter((x) => x !== 'Ninguna')),
        kv('Otras situaciones con esta persona', labs('otras_situaciones')), kv('Causa judicial', labs('causa_existe')),
        kv('Medida judicial vigente', labs('medida_vigente')), kv('Medida incumplida', labs('medida_incumplida')),
        kv('Hechos de gravedad', labs('gravedad').filter((x) => x !== 'Ninguna de estas')), kv('Barreras de acceso', labs('barreras').filter((x) => x !== 'Ninguna de estas'))]);
  const notificacion = existente ? [] : ok([kv('Domicilio', answers.d_domicilio), kv('Lugar de trabajo', answers.d_trabajo), kv('Teléfono', answers.d_telefono), kv('Referencias', answers.d_referencias)]);

  return {
    answers, secciones, indicadores, prioridad, derivacion,
    entrada: answers.entrada, entradaLabel: existente ? ENTRADA.existente : 'Denuncia nueva',
    tipos, medidas, barreras: arr('barreras').filter((b) => b !== 'ninguna'),
    relato: answers.relato || answers.e_hecho || null,
    bloques: { datosBasicos, situacion, notificacion },
    resumen: `${existente ? 'Causa existente' : 'Denuncia nueva por violencia familiar o de género'}. ${existente ? 'Necesita' : 'Tipos'}: ${tipos.join(', ') || 'sin especificar'}. ` +
      `Medidas solicitadas: ${medidas.length}. Prioridad de revisión: ${prioridad.label} (orientativa, no es una evaluación de riesgo).`,
  };
}

export function publicLegajo(l) {
  const { answers, ...rest } = l; // eslint-disable-line no-unused-vars
  return rest;
}

export function armarCorreo(l, nombre, email) {
  const lineas = [`Ingreso: ${l.id}`, `Tipo: ${l.entradaLabel}`, `Prioridad de revisión: ${l.prioridad.label}`,
    `Indicadores: ${l.indicadores.map((i) => i.label).join(', ') || 'sin indicadores'}`,
    `Medidas solicitadas: ${l.medidas.join(', ') || 'ninguna'}`, `Juzgado sugerido: ${l.derivacion.sugerido} (validación pendiente)`];
  return { para: email, asunto: `Asignación ${l.id} · ${l.entradaLabel}`, preparadoEn: new Date().toISOString(),
    cuerpo: `Hola ${nombre}:\n\nSe te asignó un nuevo ingreso en Puertas Claras.\n\n${lineas.join('\n')}\n\nIngresá a la bandeja para revisar el detalle completo y validar la derivación.\n\nMensaje automático de demostración · PIL 2026` };
}
