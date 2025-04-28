import { PrismaClient } from "@prisma/client";
import logger from "./logger";

// Connection management variables
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 500;
const SLOW_QUERY_THRESHOLD_MS = 500; // Configurable threshold for slow queries

// Create a singleton instance of PrismaClient with correct configuration
const prisma = new PrismaClient({
	log: [
		{ level: "query", emit: "event" },
		{ level: "error", emit: "stdout" },
		{ level: "info", emit: "stdout" }, // Additional logging for connection events
		{ level: "warn", emit: "stdout" },
	],
	datasources: {
		db: {
			url: process.env.DATABASE_URL,
		},
	},
});

// Connection management
let isConnected = false;
let connectionAttemptInProgress = false;
let reconnectPromise: Promise<void> | null = null;

async function connectWithRetry() {
	// If connection attempt is already in progress, wait for it
	if (connectionAttemptInProgress && reconnectPromise) {
		return reconnectPromise;
	}

	let retries = 0;
	connectionAttemptInProgress = true;
	reconnectPromise = (async () => {
		while (retries < MAX_RETRIES) {
			try {
				if (!isConnected) {
					await prisma.$connect();
					isConnected = true;
					logger.info("Successfully connected to the database");
				}
				connectionAttemptInProgress = false;
				return;
			} catch (error) {
				retries++;
				logger.error(
					`Failed to connect to database (attempt ${retries}/${MAX_RETRIES}): ${error instanceof Error ? error.message : "Unknown error"}`,
				);

				if (retries >= MAX_RETRIES) {
					logger.error("Max retries reached. Could not connect to database.");
					connectionAttemptInProgress = false;
					throw error;
				}

				// Wait before retrying with exponential backoff
				const backoffTime = RETRY_DELAY_MS * 2 ** (retries - 1);
				logger.info(`Waiting ${backoffTime}ms before retry...`);
				await new Promise((resolve) => setTimeout(resolve, backoffTime));
			}
		}
	})();

	return reconnectPromise;
}

// Connect on startup
connectWithRetry().catch((error) => {
	logger.error(
		`Initial database connection failed: ${error instanceof Error ? error.message : "Unknown error"}`,
	);
	// Don't exit process here, let the application try to recover
});

// Log slow queries to help identify performance bottlenecks
prisma.$on("query", (e) => {
	if (e.duration > SLOW_QUERY_THRESHOLD_MS) {
		// Log queries taking longer than threshold
		logger.warn(`Slow query (${e.duration}ms): ${e.query}`);

		// For extremely slow queries, log at error level and include more details
		if (e.duration > SLOW_QUERY_THRESHOLD_MS * 3) {
			logger.error(`Very slow query detected (${e.duration}ms)`, {
				query: e.query,
				params: e.params,
				duration: e.duration,
				timestamp: new Date().toISOString(),
			});
		}
	}
});

// Handle query errors
prisma.$on("query", (e) => {
	if (e.query?.includes("ERROR")) {
		logger.error(`Prisma query error: ${e.query}`);
	}
});

// Improved connection error detection
function isConnectionError(error: unknown): boolean {
	if (!(error instanceof Error)) return false;

	const errorMessage = error.message.toLowerCase();

	return (
		errorMessage.includes("connection") ||
		errorMessage.includes("closed") ||
		errorMessage.includes("timeout") ||
		errorMessage.includes("socket") ||
		errorMessage.includes("econnreset") ||
		errorMessage.includes("econnrefused") ||
		errorMessage.includes("network") ||
		// Specific Prisma/PostgreSQL connection error codes
		errorMessage.includes("p1001") || // Can't reach database server
		errorMessage.includes("p1002") // Database server terminated the connection
	);
}

// Create a wrapper for Prisma operations with automatic reconnection
export async function withRetry<T>(
	operation: () => Promise<T>,
	operationName = "Database operation",
	retries = 3,
): Promise<T> {
	let lastError: unknown;

	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			// Check connection before operation
			if (!isConnected) {
				await connectWithRetry();
			}

			// Execute the database operation
			const startTime = Date.now();
			const result = await operation();
			const duration = Date.now() - startTime;

			// Log slow operations (separate from query logging)
			if (duration > SLOW_QUERY_THRESHOLD_MS) {
				logger.warn(`Slow ${operationName} (${duration}ms)`);
			}

			return result;
		} catch (error) {
			lastError = error;

			// Check if it's a connection error
			if (isConnectionError(error)) {
				logger.warn(
					`${operationName} failed due to connection issue (attempt ${attempt}/${retries}): ${error instanceof Error ? error.message : "Unknown error"}`,
				);

				// Mark as disconnected
				isConnected = false;

				// Try to disconnect properly
				try {
					await prisma.$disconnect();
				} catch (disconnectError) {
					logger.error(
						`Error during disconnect: ${disconnectError instanceof Error ? disconnectError.message : "Unknown error"}`,
					);
				}

				// Wait before retry with backoff
				if (attempt < retries) {
					const delay = RETRY_DELAY_MS * 2 ** (attempt - 1);
					logger.info(`Waiting ${delay}ms before retry...`);
					await new Promise((resolve) => setTimeout(resolve, delay));

					// Try to reconnect
					try {
						await connectWithRetry();
					} catch (reconnectError) {
						logger.error(
							`Reconnection failed: ${reconnectError instanceof Error ? reconnectError.message : "Unknown error"}`,
						);
					}
				}
			} else {
				// Not a connection error, log and rethrow
				logger.error(
					`${operationName} failed with error: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
				throw error;
			}
		}
	}

	// If we get here, all retries failed
	logger.error(`All ${retries} retry attempts failed for ${operationName}`);
	throw lastError;
}

// Health check function that applications can use to verify database connectivity
export async function checkDatabaseHealth(): Promise<boolean> {
	try {
		// Simple query to check database connectivity
		await prisma.$queryRaw`SELECT 1`;
		return true;
	} catch (error) {
		logger.error(
			`Database health check failed: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		isConnected = false;
		return false;
	}
}

// Handle connection errors and reconnect
process.on("uncaughtException", async (error) => {
	logger.error(`Uncaught exception: ${error.message}`, { stack: error.stack });

	if (isConnectionError(error)) {
		logger.info(
			"Connection-related uncaught exception. Attempting to reconnect Prisma client",
		);
		isConnected = false;
		try {
			await prisma.$disconnect();
			await connectWithRetry();
		} catch (reconnectError) {
			logger.error(
				`Failed to reconnect: ${reconnectError instanceof Error ? reconnectError.message : "Unknown error"}`,
			);
		}
	}
});

// Graceful shutdown
const signals = ["SIGINT", "SIGTERM"];
for (const signal of signals) {
	process.on(signal, async () => {
		logger.info(`${signal} received, closing database connection...`);
		try {
			await prisma.$disconnect();
			logger.info("Database connection closed successfully.");
		} catch (error) {
			logger.error(
				`Error during database disconnect: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
		process.exit(0);
	});
}

export default prisma;
