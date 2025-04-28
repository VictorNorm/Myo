import { PrismaClient } from "@prisma/client";
import logger from "./logger";

// Create a singleton instance of PrismaClient with connection pool configuration
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'stdout' },
  ],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Configure connection pool
  // Higher max connections can help with concurrency, but avoid setting too high
  connection: {
    keepAlive: true, // Keep connections alive
    maxIdleTimeInMs: 300000, // 5 minutes (avoid closing idle connections too quickly)
    maxUses: 100, // Number of times a connection can be reused before being released
  },
});

// Log slow queries to help identify performance bottlenecks
prisma.$on('query', (e) => {
  if (e.duration > 500) { // Log queries taking longer than 500ms
    logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
  }
});

// Handle connection errors
prisma.$on('error', (e) => {
  logger.error(`Prisma error: ${e.message}`);
});

// Add reconnection on error
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${error.message}`, { stack: error.stack });
  if (error.message.includes('Connection') || error.message.includes('connection')) {
    logger.info('Attempting to reconnect Prisma client');
    prisma.$disconnect().then(() => prisma.$connect());
  }
});

export default prisma;