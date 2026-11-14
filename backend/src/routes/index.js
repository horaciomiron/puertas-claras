import { Router } from 'express';
import { citizenController } from '../controllers/citizen.js';
import { staffController } from '../controllers/staff.js';
import { chatController } from '../controllers/chat.js';
import { ayudaController } from '../controllers/ayuda.js';
import { requireRole, rateLimit } from '../middleware/auth.js';

// Express 4 no captura promesas rechazadas: se envuelve cada handler.
const wrap = (fn) => (req, res, next) => Promise.resolve().then(() => fn(req, res, next)).catch(next);

export function buildRoutes(ctx) {
  const r = Router();
  const c = citizenController(ctx);
  const s = staffController(ctx);
  const ch = chatController(ctx);
  const ay = ayudaController(ctx);
  const cit = requireRole('ciudadania');
  const op = requireRole('operador');
  r.use(rateLimit());

  r.get('/health', (_req, res) => res.json({ ok: true, servicio: 'puertas-claras', demo: true }));
  r.get('/entrevista', wrap(c.interview));

  r.get('/chat/pasos', wrap(ch.pasos));
  r.post('/chat/turno', rateLimit(40), wrap(ch.turno));

  r.get('/ayuda', wrap(ay.info));
  r.post('/ayuda', rateLimit(30), wrap(ay.preguntar));

  r.post('/auth/ciudadania', wrap(c.login));
  r.post('/auth/operador', rateLimit(20), wrap(s.login));

  r.put('/borrador', cit, wrap(c.putDraft));
  r.delete('/borrador', cit, wrap(c.deleteDraft));
  r.post('/legajo/vista-previa', cit, wrap(c.preview));
  r.post('/presentaciones', cit, wrap(c.submit));
  r.get('/seguimiento/:codigo', wrap(c.tracking));

  r.get('/catalogos', op, wrap(s.catalogos));
  r.get('/legajos', op, wrap(s.list));
  r.get('/legajos/:id', op, wrap(s.get));
  r.patch('/legajos/:id', op, wrap(s.update));
  r.get('/estadisticas', op, wrap(s.stats));
  return r;
}
