import { generateApiKey } from '../middleware/auth.middleware';
import { prisma } from '../config/database';
import { NotFoundError } from '../errors/AppError';

export class ApiKeyService {
  /**
   * Create an API key for an organization.
   * Returns the raw key ONCE — it is never stored.
   */
  static async create(organizationId: string, name: string) {
    const { raw, hash, prefix } = generateApiKey();
    const apiKey = await prisma.apiKey.create({
      data: { organizationId, name, keyHash: hash, keyPrefix: prefix },
      select: { id: true, name: true, keyPrefix: true, createdAt: true },
    });
    return { ...apiKey, rawKey: raw };
  }

  static async list(organizationId: string) {
    return prisma.apiKey.findMany({
      where: { organizationId, revokedAt: null },
      select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async revoke(organizationId: string, id: string) {
    const key = await prisma.apiKey.findFirst({ where: { id, organizationId } });
    if (!key) throw new NotFoundError('API key not found');
    await prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  }
}
