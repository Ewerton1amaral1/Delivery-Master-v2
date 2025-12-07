import { PrismaClient } from '@prisma/client';

console.log('[Prisma] Initializing Client...');
console.log('[Prisma] CWD:', process.cwd());
console.log('[Prisma] DATABASE_URL (env):', process.env.DATABASE_URL);

const prisma = new PrismaClient({
    log: ['query', 'info', 'warn', 'error'],
});

export default prisma;
