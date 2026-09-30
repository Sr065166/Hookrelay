import bcrypt from 'bcrypt';
import { prisma } from '../config/database.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../middleware/auth.middleware.js';
import { ConflictError, UnauthorizedError } from '../errors/AppError.js';
import type { RegisterInput, LoginInput } from '../validators/auth.validator.js';

const SALT_ROUNDS = 12;

export class AuthService {
  /**
   * Register a new user. Returns tokens.
   * Throws ConflictError if email already exists.
   */
  static async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash,
      },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    return { user, accessToken, refreshToken };
  }

  /**
   * Login with email + password. Returns tokens.
   * Throws UnauthorizedError on bad credentials.
   */
  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const accessToken = signAccessToken(user.id);
    const refreshToken = signRefreshToken(user.id);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Exchange a valid refresh token for a new access token.
   */
  static async refresh(rawRefreshToken: string) {
    const payload = verifyRefreshToken(rawRefreshToken); // throws if invalid/expired
    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    const accessToken = signAccessToken(user.id);
    return { accessToken };
  }

  /**
   * Get user profile by id (no sensitive fields).
   */
  static async getProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            organization: {
              select: { id: true, name: true, slug: true }
            }
          }
        }
      },
    });
  }
}
