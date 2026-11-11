const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

export async function api(path, { method = 'GET', body, token } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw Object.assign(new Error('No pudimos conectarnos con el servidor. Revisá tu conexión e intentá de nuevo.'), { status: 0 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Ocurrió un error.'), { status: res.status, detalles: data.detalles });
  return data;
}
export const isVisible = (step, answers) =>
  !step.showIf || Object.entries(step.showIf).every(([k, vals]) => (Array.isArray(answers[k]) ? answers[k] : [answers[k]]).some((x) => vals.includes(x)));
