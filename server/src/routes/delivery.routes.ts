import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { EventService } from '../services/event.service.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { paginationSchema } from '../validators/event.validator.js';
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
