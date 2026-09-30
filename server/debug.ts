import { prisma } from './src/config/database';
import { processDeliveries } from './src/worker';

async function run() {
  const pending = await prisma.delivery.findMany({ where: { status: 'PENDING' } });
  console.log("Pending:", pending.length);
  const row = await prisma.$queryRawUnsafe(`SELECT NOW() as db_now`);
  console.log("DB NOW:", row);
  console.log("NODE NOW:", new Date());
}
run();
