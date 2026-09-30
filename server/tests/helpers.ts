import { prisma } from '../src/config/database';
import { signAccessToken } from '../src/middleware/auth.middleware';
import crypto from 'crypto';

export async function createTestUserAndOrg(role: 'OWNER' | 'ADMIN' | 'DEVELOPER' | 'VIEWER' = 'OWNER') {
  const uniq = crypto.randomBytes(4).toString('hex');
  const user = await prisma.user.create({
    data: {
      email: `test-${uniq}@example.com`,
      name: `Test User ${uniq}`,
      passwordHash: 'dummy',
    }
  });

  const org = await prisma.organization.create({
    data: {
      name: `Test Org ${uniq}`,
      slug: `test-org-${uniq}`,
    }
  });

  await prisma.membership.create({
    data: {
      userId: user.id,
      organizationId: org.id,
      role,
    }
  });

  const apiKey = await prisma.apiKey.create({
    data: {
      organizationId: org.id,
      keyHash: crypto.createHash('sha256').update(`key-${uniq}`).digest('hex'),
      name: `Test Key ${uniq}`,
      keyPrefix: 'hr_',
    }
  });

  const token = signAccessToken(user.id);

  return { user, org, rawApiKey: `key-${uniq}`, token };
}
