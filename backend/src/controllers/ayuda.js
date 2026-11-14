import { HttpError } from '../errors.js';
import { chatAyudaModo, responder } from '../services/ayuda.js';

// No se guarda ni se registra nada del mensaje. Solo se recibe el ID de la pregunta y la duda escrita.
export const ayudaController = ({ config, ayudaIA }) => ({
  info: (_req, res) => res.json({ nombre: 'Clara', modo: chatAyudaModo() }),
  preguntar: async (req, res) => {
    const { paso, mensaje } = req.body || {};
    if (mensaje !== undefined && typeof mensaje !== 'string') throw new HttpError(400, 'El mensaje no es válido.');
    if ((mensaje || '').length > 300) throw new HttpError(400, 'El mensaje es demasiado largo (máximo 300 caracteres).');
    res.json(await responder({ pasoId: typeof paso === 'string' ? paso : 'inicio', mensaje: (mensaje || '').trim(), config, ...(ayudaIA ? { ia: ayudaIA } : {}) }));
  },
});
