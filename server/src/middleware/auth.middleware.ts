import { createHash, randomBytes } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config/env';
import { UnauthorizedError } from '../errors/AppError';

// ─── Augment Express Request ───────────────────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      orgId?: string;
    }
  }
}

// ─── JWT helpers ───────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string; // userId
  type: 'access' | 'refresh';
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'access' } as JwtPayload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' } as JwtPayload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

export function verifyRefreshToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
}

// ─── API Key helpers ────────────────────────────────────────────────────────

const API_KEY_PREFIX = 'hr_';
const API_KEY_BYTES = 32;

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const randomPart = randomBytes(API_KEY_BYTES).toString('hex');
  const raw = `${API_KEY_PREFIX}${randomPart}`;
  const hash = createHash('sha256').update(raw).digest('hex');
  const prefix = raw.slice(0, 10);
  return { raw, hash, prefix };
}

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

// ─── JWT Auth middleware ────────────────────────────────────────────────────

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header'));
  }
  const token = authHeader.slice(7);
  const payload = verifyAccessToken(token); // throws UnauthorizedError on failure
  req.userId = payload.sub;
  next();
}

// ─── API Key auth middleware (for POST /v1/events) ─────────────────────────

export async function requireApiKey(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const rawKey = req.headers['x-api-key'] as string | undefined;
    if (!rawKey) {
      return next(new UnauthorizedError('Missing X-Api-Key header'));
    }
    const keyHash = hashApiKey(rawKey);
    const apiKey = await prisma.apiKey.findFirst({
      where: { keyHash, revokedAt: null },
      select: { id: true, organizationId: true },
    });
    if (!apiKey) {
      return next(new UnauthorizedError('Invalid or revoked API key'));
    }
    // Record last used
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });
    req.orgId = apiKey.organizationId;
    next();
  } catch (err) {
    next(err);
  }
}
