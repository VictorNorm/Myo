import { PrismaClient } from "@prisma/client";
import logger from "./logger";

// Create a singleton instance of PrismaClient with appropriate configuration
const prisma = new PrismaClient({
	log: [
		{ level: "query", emit: "event" },
		{ level: "error", emit: "stdout" },
	],
	datasources: {
		db: {
			url: process.env.DATABASE_URL,
		},
	},
	// Remove the connection pooling configuration as it's not compatible
	// with your current Prisma version
});

// Log slow queries to help identify performance bottlenecks
prisma.$on("query", (e) => {
	if (e.duration > 500) {
		// Log queries taking longer than 500ms
		logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
	}
});

// Handle query errors - note that we're handling 'query' events, not 'error'
// since 'error' is not a valid event type in this Prisma version
prisma.$on("query", (e) => {
	if (e.query?.includes("ERROR")) {
		logger.error(`Prisma query error: ${e.query}`);
	}
});

// Add reconnection on error
process.on("uncaughtException", (error) => {
	logger.error(`Uncaught exception: ${error.message}`, { stack: error.stack });
	if (
		error.message.includes("Connection") ||
		error.message.includes("connection")
	) {
		logger.info("Attempting to reconnect Prisma client");
		prisma.$disconnect().then(() => prisma.$connect());
	}
});

export default prisma;
