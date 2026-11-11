import express from 'express';
import cors from 'cors';
import { buildRoutes } from './routes/index.js';
import { notFound, errorHandler } from './middleware/errors.js';

export function createApp({ repo, config }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(cors(config.cors));
  app.use((_req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
    next();
  });
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', buildRoutes({ repo, config }));
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
