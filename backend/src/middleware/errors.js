import { HttpError } from '../errors.js';

export const notFound = (req, _res, next) => next(new HttpError(404, `No existe la ruta ${req.method} ${req.path}`));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'El JSON enviado no es válido.' });
  if (err.type === 'entity.too.large') return res.status(400).json({ error: 'El contenido enviado es demasiado grande.' });
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message, ...(err.details ? { detalles: err.details } : {}) });
  console.error(err); // nunca devolver detalles internos
  res.status(500).json({ error: 'Ocurrió un error inesperado. Intentá de nuevo.' });
}
