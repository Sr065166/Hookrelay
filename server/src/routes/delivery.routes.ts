import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { EventService } from '../services/event.service';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { paginationSchema } from '../validators/event.validator';
import { z } from 'zod';

// Routes are mounted under /v1/orgs/:orgId/deliveries
export const deliveryRouter = Router({ mergeParams: true });

const canRead = [Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER];

const deliveryFilterSchema = paginationSchema.extend({
  status: z.enum(['PENDING', 'DELIVERING', 'DELIVERED', 'FAILED']).optional(),
  endpointId: z.string().optional(),
});

// GET /v1/orgs/:orgId/deliveries
deliveryRouter.get(
  '/',
  requireAuth,
  requireRole(canRead),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, status, endpointId } = deliveryFilterSchema.parse(req.query);
      const result = await EventService.listDeliveries(req.orgId!, page, limit, {
        status,
        endpointId,
      });
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /v1/orgs/:orgId/deliveries/:id/replay
deliveryRouter.post(
  '/:id/replay',
  requireAuth,
  requireRole([Role.OWNER, Role.ADMIN, Role.DEVELOPER]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deliveryId = req.params.id;
      // Re-queue the delivery by setting status back to PENDING and nextRetryAt to now
      const result = await EventService.replayDelivery(req.orgId!, deliveryId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);
