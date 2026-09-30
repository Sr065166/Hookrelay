import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import {
  registerSchema,
  loginSchema,
  refreshSchema,
} from '../validators/auth.validator.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const authRouter = Router();

// POST /auth/register
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = registerSchema.parse(req.body);
    const result = await AuthService.register(input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await AuthService.login(input);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// POST /auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await AuthService.refresh(refreshToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /auth/me — requires authentication
authRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await AuthService.getProfile(req.userId!);
    if (!profile) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
    }
    res.json(profile);
  } catch (err) {
    next(err);
  }
});
