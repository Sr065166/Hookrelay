import { Router, Request, Response } from 'express';
import { HealthService } from '../services/health.service.js';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response) => {
  const health = HealthService.getHealth();
  res.status(200).json(health);
});
