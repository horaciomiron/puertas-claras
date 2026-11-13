const tally = (arr) => {
  const m = new Map();
  arr.forEach((x) => m.set(x, (m.get(x) || 0) + 1));
  return [...m].map(([label, n]) => ({ label, n })).sort((a, b) => b.n - a.n);
};
export function computeStats(legajos, config) {
  const E = config.gestion.estados;
  const horas = legajos.filter((l) => l.primeraRespuestaEn).map((l) => (new Date(l.primeraRespuestaEn) - new Date(l.creadoEn)) / 36e5);
  const nombre = (id) => config.organismos.find((o) => o.id === id)?.nombre || '—';
  return {
    total: legajos.length,
    pendientes: legajos.filter((l) => ['recibido', 'en_revision'].includes(l.estado)).length,
    urgentes: legajos.filter((l) => l.prioridad.key !== 'ordinaria').length,
    conAntecedente: legajos.filter((l) => l.derivacion.antecedente.existe === 'si').length,
    tiempoRespuestaHoras: horas.length ? Math.round((horas.reduce((a, b) => a + b, 0) / horas.length) * 10) / 10 : null,
    porIngreso: tally(legajos.map((l) => l.entradaLabel)),
    porTipo: tally(legajos.flatMap((l) => l.tipos)),
    medidas: tally(legajos.flatMap((l) => l.medidas)),
    porEstado: tally(legajos.map((l) => E[l.estado].label)),
    porPrioridad: tally(legajos.map((l) => l.prioridad.label)),
    porJuzgado: tally(legajos.map((l) => l.derivacion.sugerido)),
    barreras: tally(legajos.flatMap((l) => l.barreras)),
    derivaciones: tally(legajos.filter((l) => l.resultado?.tipo === 'derivacion').map((l) => nombre(l.resultado.organismoId))),
  };
}
