import { Router, Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { EndpointService } from '../services/endpoint.service';
import { requireAuth } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { ssrfProtection } from '../middleware/ssrf.middleware';
import {
  createEndpointSchema,
  updateEndpointSchema,
} from '../validators/endpoint.validator';
import { paginationSchema } from '../validators/event.validator';

// Routes are mounted under /v1/orgs/:orgId/endpoints
export const endpointRouter = Router({ mergeParams: true });

const canRead = [Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.VIEWER];
const canWrite = [Role.OWNER, Role.ADMIN, Role.DEVELOPER];
const canDelete = [Role.OWNER, Role.ADMIN];

// GET /v1/orgs/:orgId/endpoints
endpointRouter.get(
  '/',
  requireAuth,
  requireRole(canRead),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit } = paginationSchema.parse(req.query);
      const result = await EndpointService.listEndpoints(req.orgId!, page, limit);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

// POST /v1/orgs/:orgId/endpoints
endpointRouter.post(
  '/',
  requireAuth,
  requireRole(canWrite),
  ssrfProtection,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = createEndpointSchema.parse(req.body);
      const endpoint = await EndpointService.createEndpoint(req.orgId!, input);
      res.status(201).json(endpoint);
    } catch (err) {
      next(err);
    }
  },
);

// GET /v1/orgs/:orgId/endpoints/:id
endpointRouter.get(
  '/:id',
  requireAuth,
  requireRole(canRead),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const endpoint = await EndpointService.getEndpoint(req.orgId!, req.params.id);
      res.json(endpoint);
    } catch (err) {
      next(err);
    }
  },
);

// PATCH /v1/orgs/:orgId/endpoints/:id
endpointRouter.patch(
  '/:id',
  requireAuth,
  requireRole(canWrite),
  ssrfProtection,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const input = updateEndpointSchema.parse(req.body);
      const endpoint = await EndpointService.updateEndpoint(req.orgId!, req.params.id, input);
      res.json(endpoint);
    } catch (err) {
      next(err);
    }
  },
);

// DELETE /v1/orgs/:orgId/endpoints/:id
endpointRouter.delete(
  '/:id',
  requireAuth,
  requireRole(canDelete),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await EndpointService.deleteEndpoint(req.orgId!, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
);
