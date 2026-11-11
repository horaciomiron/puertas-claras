import { randomUUID, randomInt } from 'node:crypto';
const TTL = 4 * 3600e3;
const sessions = new Map(); // en memoria: se pierde al reiniciar (aceptable en demo)

export function createSession(data) {
  const token = randomUUID();
  sessions.set(token, { ...data, exp: Date.now() + TTL });
  return token;
}
export function getSession(token) {
  const s = sessions.get(token);
  if (!s) return null;
  if (s.exp < Date.now()) { sessions.delete(token); return null; }
  return s;
}
const ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export function makeCode(prefix) {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHA[randomInt(ALPHA.length)];
  return `${prefix}-${s}`;
}
