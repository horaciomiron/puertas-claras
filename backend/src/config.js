import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const json = (f) => JSON.parse(fs.readFileSync(path.join(root, 'config', f), 'utf8'));

export function loadConfig(env = process.env) {
  const origins = (env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean);
  return {
    port: Number(env.PORT) || 3001,
    dataDir: env.DATA_DIR || path.join(root, 'data'),
    cors: { origin: origins.includes('*') ? true : origins },
    // AUTENTICACIÓN PROVISORIA DE DEMOSTRACIÓN: no es seguridad real.
    staff: { usuario: env.STAFF_USER || 'operador.demo', clave: env.STAFF_PASSWORD || 'demo-2026' },
    interview: json('interview.json'),
    organismos: json('organismos.json'),
    reglas: json('derivacion.json'),
    gestion: json('gestion.json'),
  };
}
