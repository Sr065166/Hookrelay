/**
 * Prisma seed for local development.
 * Creates a test user, organization, membership, and API key.
 * Run with: npx prisma db seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test user
  const passwordHash = await bcrypt.hash('password123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'owner@hookrelay.dev' },
    update: {},
    create: {
      email: 'owner@hookrelay.dev',
      name: 'HookRelay Owner',
      passwordHash,
    },
  });
  console.log(`✅ User: ${user.email}`);

  // Create test organization
  const org = await prisma.organization.upsert({
    where: { slug: 'acme' },
    update: {},
    create: {
      name: 'Acme Corp',
      slug: 'acme',
    },
  });
  console.log(`✅ Organization: ${org.name} (${org.id})`);

  // Create ownership membership
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: {
      userId: user.id,
      organizationId: org.id,
      role: 'OWNER',
    },
  });
  console.log(`✅ Membership: ${user.email} → ${org.name} (OWNER)`);

  // Create a default API key
  const rawKey = `hr_${randomBytes(32).toString('hex')}`;
  const keyHash = createHash('sha256').update(rawKey).digest('hex');
  const keyPrefix = rawKey.slice(0, 10);

  const apiKey = await prisma.apiKey.create({
    data: {
      organizationId: org.id,
      name: 'Default Development Key',
      keyHash,
      keyPrefix,
    },
  });
  console.log(`✅ API Key: ${apiKey.name} (prefix: ${keyPrefix})`);
  console.log(`   ⚠️  Raw key (save this — shown only once): ${rawKey}`);

  // Create a test endpoint
  const endpoint = await prisma.endpoint.upsert({
    where: { id: 'seed-endpoint-001' },
    update: {},
    create: {
      id: 'seed-endpoint-001',
      organizationId: org.id,
      url: 'https://webhook.site/hookrelay-test',
      description: 'Default test endpoint',
      secret: randomBytes(32).toString('hex'),
      eventsSubscribed: ['*'],
    },
  });
  console.log(`✅ Endpoint: ${endpoint.url}`);

  console.log('\n🎉 Seed complete!');
  console.log(`   Org ID: ${org.id}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
