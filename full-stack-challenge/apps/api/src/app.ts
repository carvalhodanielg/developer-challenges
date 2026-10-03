import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { AppError } from './errors/AppError';
import { errorHandler } from './middlewares/errorHandler';
import { authRoutes } from './modules/auth/auth.routes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // credentials: true lets the browser send the auth cookie cross-origin; it
  // requires an explicit origin list, never "*".
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  const api = express.Router();
  api.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  api.use('/auth', authRoutes);
  app.use('/api/v1', api);

  app.use((req) => {
    throw AppError.notFound(`Route ${req.method} ${req.path} not found`);
  });
  app.use(errorHandler);

  return app;
}
