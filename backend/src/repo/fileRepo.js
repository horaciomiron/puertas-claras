// Capa de acceso a datos. Para pasar a una base real, implementar esta misma
// interfaz (list, get, insertWith, update, remove) y cambiarla en server.js.
import fs from 'node:fs/promises';
import path from 'node:path';

export class FileRepo {
  constructor(dir) {
    this.dir = dir;
    this.cache = new Map();
    this.queue = Promise.resolve();
  }
  file(c) { return path.join(this.dir, `${c}.json`); }
  async load(c) {
    if (this.cache.has(c)) return this.cache.get(c);
    let data = [];
    try { data = JSON.parse(await fs.readFile(this.file(c), 'utf8')); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (!this.cache.has(c)) this.cache.set(c, data);
    return this.cache.get(c);
  }
  persist(c) {
    this.queue = this.queue.then(async () => {
      await fs.mkdir(this.dir, { recursive: true });
      const tmp = this.file(c) + '.tmp';
      await fs.writeFile(tmp, JSON.stringify(this.cache.get(c), null, 2));
      await fs.rename(tmp, this.file(c));
    });
    return this.queue;
  }
  async list(c, pred) { const d = await this.load(c); return pred ? d.filter(pred) : [...d]; }
  async get(c, id) { return (await this.load(c)).find((x) => x.id === id) || null; }
  async insertWith(c, factory) {
    const d = await this.load(c);
    const doc = factory(d); // síncrono: evita carreras al generar ids
    d.push(doc);
    await this.persist(c);
    return doc;
  }
  async update(c, id, patch) {
    const d = await this.load(c);
    const i = d.findIndex((x) => x.id === id);
    if (i < 0) return null;
    d[i] = { ...d[i], ...patch };
    await this.persist(c);
    return d[i];
  }
  async remove(c, id) {
    const d = await this.load(c);
    const i = d.findIndex((x) => x.id === id);
    if (i < 0) return false;
    d.splice(i, 1);
    await this.persist(c);
    return true;
  }
}
