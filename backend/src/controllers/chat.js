import { HttpError } from '../errors.js';
import { infoChat, interpretar } from '../services/chat.js';

// El texto de la persona NO se guarda ni se registra: se interpreta y se descarta.
export const chatController = ({ config, ia }) => ({
  pasos: (_req, res) => res.json(infoChat()),
  turno: async (req, res) => {
    const { paso, texto } = req.body || {};
    if (typeof texto !== 'string' || !texto.trim()) throw new HttpError(400, 'Escribí tu respuesta.');
    if (texto.length > 500) throw new HttpError(400, 'La respuesta es demasiado larga (máximo 500 caracteres).');
    const r = await interpretar({ pasoId: paso, texto: texto.trim(), config, ...(ia ? { ia } : {}) });
    if (!r) throw new HttpError(400, 'Paso desconocido.');
    res.json(r);
  },
});
