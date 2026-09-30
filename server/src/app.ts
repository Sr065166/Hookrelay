import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { requestLogger } from './middleware/requestLogger.middleware';
import { errorHandler } from './middleware/errorHandler.middleware';
import { routes } from './routes/index';
import { healthRouter } from './routes/health.routes';
import { config } from './config/env';

// Rate limiter for auth routes — 20 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  skip: () => config.nodeEnv === 'test',
});

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  skip: () => config.nodeEnv === 'test',
});

export function createApp(): Application {
  const app = express();

  // Security headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  // CORS
  app.use(cors({ origin: config.clientUrl }));

  // Body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger);

  // Health — no rate limit
  app.use('/health', healthRouter);

  // Apply auth rate limiter to auth routes
  app.use('/api/v1/auth', authLimiter);

  // General API rate limiter
  app.use('/api', apiLimiter);

  // All other routes
  app.use('/api', routes);

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
