import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ApiKeyService } from '../services/apiKey.service';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { z } from 'zod';

// Routes are mounted under /v1/orgs/:orgId/api-keys
export const apiKeyRouter = Router({ mergeParams: true });

const canManageKeys = [Role.OWNER, Role.ADMIN, Role.DEVELOPER];
const canRead = [Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER];

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
});

// GET /v1/orgs/:orgId/api-keys
apiKeyRouter.get(
  '/',
  requireAuth,
  requireRole(canRead),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const keys = await ApiKeyService.list(req.orgId!);
      res.json(keys);
    } catch (err) {
      next(err);
    }
  },
);

// POST /v1/orgs/:orgId/api-keys
apiKeyRouter.post(
  '/',
  requireAuth,
  requireRole(canManageKeys),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name } = createKeySchema.parse(req.body);
      const result = await ApiKeyService.create(req.orgId!, name);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /v1/orgs/:orgId/api-keys/:id
apiKeyRouter.delete(
  '/:id',
  requireAuth,
  requireRole([Role.OWNER, Role.ADMIN]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ApiKeyService.revoke(req.orgId!, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
