import { HttpError } from '../errors.js';
import { getSession } from '../services/sessions.js';

export const requireRole = (role) => (req, _res, next) => {
  const m = /^Bearer (.+)$/.exec(req.get('authorization') || '');
  const s = m && getSession(m[1]);
  if (!s) return next(new HttpError(401, 'Necesitás iniciar sesión.'));
  if (s.role !== role) return next(new HttpError(403, 'No tenés permiso para esta acción.'));
  req.session = s;
  next();
};

export function rateLimit(max = 120, windowMs = 60000) {
  const hits = new Map();
  return (req, _res, next) => {
    const now = Date.now();
    const h = (hits.get(req.ip) || []).filter((t) => now - t < windowMs);
    h.push(now);
    hits.set(req.ip, h);
    if (h.length > max) return next(new HttpError(429, 'Demasiados intentos. Esperá un momento.'));
    next();
  };
}
