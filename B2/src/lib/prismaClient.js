import { PrismaClient } from '@prisma/client';

// Singleton pattern: in Vercel serverless functions and in local dev with
// `node --watch`, module reinstantiation can spawn many DB connections.
// We attach the client to globalThis to reuse across hot reloads.
const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.__sabiPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__sabiPrisma = prisma;
}

export default prisma;
