const { PrismaClient } = require('../node_modules/@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: 'postgresql://postgres:postgres@localhost:5433/hookrelay' } },
});

async function run() {
  try {
    const res = await prisma.$queryRawUnsafe(`
      UPDATE deliveries
      SET status = 'DELIVERING',
          locked_at = NOW(),
          updated_at = NOW()
      WHERE id IN (
        SELECT id FROM deliveries
        WHERE status IN ('PENDING', 'FAILED')
          AND (next_retry_at IS NULL OR next_retry_at <= NOW())
          AND (locked_at IS NULL OR locked_at < NOW() - INTERVAL '5 minutes')
        ORDER BY next_retry_at ASC NULLS FIRST, created_at ASC
        LIMIT 5
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *;
    `);
    console.log('Query OK:', res);
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    prisma.$disconnect();
  }
}
run();
