import { HttpError } from '../errors.js';
import { createSession, makeCode } from '../services/sessions.js';
import { validateAnswers } from '../services/validation.js';
import { buildLegajo, publicLegajo } from '../services/legajo.js';

export const citizenController = ({ repo, config }) => ({
  interview: (_req, res) => {
    const { version, jurisdiccion, aviso, emergencia, steps } = config.interview;
    res.json({ version, jurisdiccion, aviso, emergencia, steps });
  },

  // Entrada sin DNI: un código anónimo permite retomar el borrador (minimización de datos).
  login: async (req, res) => {
    let codigo = req.body?.codigo;
    let draft;
    if (codigo !== undefined) {
      if (typeof codigo !== 'string' || !/^PC-[A-Z0-9]{6}$/.test(codigo.trim().toUpperCase()))
        throw new HttpError(400, 'El código tiene que verse así: PC-XXXXXX.');
      codigo = codigo.trim().toUpperCase();
      draft = await repo.get('borradores', codigo);
      if (!draft) throw new HttpError(404, 'No encontramos un borrador con ese código.');
    } else {
      codigo = makeCode('PC');
      draft = await repo.insertWith('borradores', () => ({ id: codigo, answers: {}, paso: 0, actualizadoEn: new Date().toISOString() }));
    }
    const token = createSession({ role: 'ciudadania', codigo });
    res.json({ token, codigo, borrador: { answers: draft.answers, paso: draft.paso } });
  },

  putDraft: async (req, res) => {
    const answers = validateAnswers(config.interview, req.body?.answers, { partial: true });
    const paso = Number.isInteger(req.body?.paso) && req.body.paso >= 0 && req.body.paso < 100 ? req.body.paso : 0;
    const d = await repo.update('borradores', req.session.codigo, { answers, paso, actualizadoEn: new Date().toISOString() });
    if (!d) throw new HttpError(404, 'El borrador ya no existe.');
    res.json({ ok: true });
  },

  deleteDraft: async (req, res) => {
    await repo.remove('borradores', req.session.codigo);
    res.json({ ok: true });
  },

  preview: (req, res) => {
    const answers = validateAnswers(config.interview, req.body?.answers);
    res.json(publicLegajo(buildLegajo(answers, config)));
  },

  submit: async (req, res) => {
    if (req.body?.consentimiento !== true) throw new HttpError(400, 'Tenés que aceptar el aviso de privacidad para enviar.');
    const answers = validateAnswers(config.interview, req.body?.answers);
    const ahora = new Date();
    const built = buildLegajo(answers, config, ahora);
    const codigoSeguimiento = makeCode('SEG');
    const now = ahora.toISOString();
    const legajo = await repo.insertWith('legajos', (all) => ({
      id: `LEG-${String(all.length + 1).padStart(4, '0')}`,
      esquema: 2, codigoSeguimiento, creadoEn: now, origen: 'prueba', ...built,
      estado: 'recibido', responsable: null, resultado: null, primeraRespuestaEn: null,
      historial: [{ en: now, quien: 'Sistema', accion: 'Presentación recibida' }],
    }));
    await repo.remove('borradores', req.session.codigo);
    res.status(201).json({ codigoSeguimiento, legajo: publicLegajo(legajo) });
  },

  tracking: async (req, res) => {
    const code = String(req.params.codigo || '').toUpperCase();
    const l = (await repo.list('legajos', (x) => x.codigoSeguimiento === code))[0];
    if (!l) throw new HttpError(404, 'No encontramos ese número de seguimiento.');
    const E = config.gestion.estados[l.estado];
    const org = l.resultado?.organismoId && config.organismos.find((o) => o.id === l.resultado.organismoId);
    res.json({
      codigoSeguimiento: l.codigoSeguimiento, ingresoEn: l.creadoEn, estado: E.label,
      revisada: l.estado !== 'recibido', infoAdicionalSolicitada: l.estado === 'info_adicional',
      derivada: l.estado === 'derivado', organismoReceptor: org ? org.nombre : null,
      proximosPasos: l.resultado?.mensajePersona || E.publico,
      aviso: 'Prototipo demostrativo: no es un expediente judicial.',
    });
  },
});
