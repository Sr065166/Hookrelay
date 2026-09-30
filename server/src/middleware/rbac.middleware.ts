import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/database.js';
import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';

/**
 * Middleware: Require that the authenticated user has at least one of the
 * specified roles in the given organization.
 *
 * The route must have :orgId as a path param, or pass it explicitly via opts.
 *
 * Usage:
 *   router.get('/', requireAuth, requireRole([Role.OWNER, Role.ADMIN]), handler)
 */
export function requireRole(allowedRoles: Role[]) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.userId;
      if (!userId) {
        return next(new UnauthorizedError('Authentication required'));
      }

      const orgId = req.params.orgId ?? req.orgId;
      if (!orgId) {
        return next(new ForbiddenError('Organization context required'));
      }

      const membership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: { userId, organizationId: orgId },
        },
        select: { role: true },
      });

      if (!membership) {
        return next(new ForbiddenError('You are not a member of this organization'));
      }

      if (!allowedRoles.includes(membership.role)) {
        return next(
          new ForbiddenError(
            `Insufficient permissions. Required roles: ${allowedRoles.join(', ')}`,
          ),
        );
      }

      // Attach orgId to request for downstream handlers
      req.orgId = orgId;
      next();
    } catch (err) {
      next(err);
    }
  };
}
