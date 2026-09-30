import { Router, Request, Response, NextFunction } from 'express';
import { EventService } from '../services/event.service';
import { requireApiKey } from '../middleware/auth.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { Role } from '@prisma/client';
import { createEventSchema, paginationSchema } from '../validators/event.validator';

// Routes are mounted under /v1/events (API key auth) and /v1/orgs/:orgId/events (JWT auth)
export const eventIngestRouter = Router({ mergeParams: true });
export const eventQueryRouter = Router({ mergeParams: true });

const canRead = [Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER];

// POST /v1/events — API key authenticated event ingestion
eventIngestRouter.post(
  '/',
  requireApiKey,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const idempotencyKey =
        (req.headers['idempotency-key'] as string | undefined) ?? req.body.idempotencyKey;
      const input = createEventSchema.parse({ ...req.body, idempotencyKey });
      const result = await EventService.createEvent(req.orgId!, input);

      const status = result.idempotent ? 200 : 201;
      res.status(status).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// GET /v1/orgs/:orgId/events — JWT + RBAC
eventQueryRouter.get(
  '/',
  requireAuth,
  requireRole(canRead),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const result = await EventService.listEvents(req.orgId!, page, limit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
