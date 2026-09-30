const { PrismaClient } = require('../node_modules/@prisma/client');
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/hookrelay';
const prisma = new PrismaClient();
prisma.user.count()
  .then(n => { console.log('Prisma query OK — Users count:', n); return prisma.$disconnect(); })
  .catch(e => { console.error('Prisma query FAIL:', e.message); process.exit(1); });
