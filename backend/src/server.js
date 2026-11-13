import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { FileRepo } from './repo/fileRepo.js';
import { buildDemoLegajos } from '../seed/demo.js';

const config = loadConfig();
const repo = new FileRepo(config.dataDir); // <- cambiar por una implementación con base real

// Sembrado de datos ficticios (solo si no existen). Los archivos de data/ NO se suben a GitHub.
// Si hay datos de una versión anterior (esquema distinto), se descartan: eran solo de demostración.
if ((await repo.list('legajos')).some((l) => l.esquema !== 2)) { await repo.clear('legajos'); await repo.clear('borradores'); console.log('Datos de una versión anterior descartados.'); }
if ((await repo.list('legajos')).length === 0) {
  for (const l of buildDemoLegajos(config)) await repo.insertWith('legajos', () => l);
  console.log('Datos de demostración ficticios cargados.');
}

createApp({ repo, config }).listen(config.port, () => console.log(`Puertas Claras API en http://localhost:${config.port}`));
