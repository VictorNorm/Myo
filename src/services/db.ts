import { PrismaClient } from "@prisma/client";
import logger from "./logger";

// Connection management variables
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 500;
const SLOW_QUERY_THRESHOLD_MS = 500; // Configurable threshold for slow queries
const CONNECTION_POOL_SIZE = 3; // Limit the connection pool size to prevent exhaustion

// Create a singleton instance of PrismaClient with optimized configuration
const prisma = new PrismaClient({
	log: [
		{ level: "query", emit: "event" },
		{ level: "error", emit: "stdout" },
		{ level: "info", emit: "stdout" },
		{ level: "warn", emit: "stdout" },
	],
	datasources: {
		db: {
			url: process.env.DATABASE_URL,
		},
	},
	// Correct way to set connection limits in Prisma
	// This limits the number of connections in the pool
});

// Connection management
let isConnected = false;
let connectionAttemptInProgress = false;
let reconnectPromise: Promise<void> | null = null;

// Add connection attempts tracking to implement circuit breaker pattern
let consecutiveFailures = 0;
const CIRCUIT_BREAKER_THRESHOLD = 10; // Max consecutive failures before circuit breaks
let circuitBreakerOpen = false;
let circuitBreakerResetTime = 0;
const CIRCUIT_BREAKER_RESET_TIMEOUT = 60000; // 1 minute timeout before retrying after circuit break

async function connectWithRetry() {
	// Check circuit breaker first
	if (circuitBreakerOpen) {
		const now = Date.now();
		if (now < circuitBreakerResetTime) {
			logger.warn(
				`Circuit breaker open, skipping connection attempt for ${Math.ceil((circuitBreakerResetTime - now) / 1000)} more seconds`,
			);
			throw new Error("Circuit breaker open");
		}
		// Reset circuit breaker
		logger.info("Circuit breaker timeout elapsed, resetting");
		circuitBreakerOpen = false;
		consecutiveFailures = 0;
	}

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
					// Reset failure counter on success
					consecutiveFailures = 0;
				}
				connectionAttemptInProgress = false;
				return;
			} catch (error) {
				retries++;
				consecutiveFailures++;
				logger.error(
					`Failed to connect to database (attempt ${retries}/${MAX_RETRIES}): ${error instanceof Error ? error.message : "Unknown error"}`,
				);

				// Check if circuit breaker should trip
				if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
					circuitBreakerOpen = true;
					circuitBreakerResetTime = Date.now() + CIRCUIT_BREAKER_RESET_TIMEOUT;
					logger.error(
						`Circuit breaker tripped after ${consecutiveFailures} consecutive failures. Will retry after ${CIRCUIT_BREAKER_RESET_TIMEOUT / 1000} seconds`,
					);
					connectionAttemptInProgress = false;
					throw new Error("Circuit breaker tripped");
				}

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

// Track active database operations to detect deadlocks or hanging queries
const activeOperations = new Map();
let operationCounter = 0;

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
		errorMessage.includes("p1002") || // Database server terminated the connection
		errorMessage.includes("server has closed the connection")
	);
}

// Add operation timeout to prevent hanging operations
const OPERATION_TIMEOUT_MS = 10000; // 10 seconds timeout for operations

// Create a wrapper for Prisma operations with automatic reconnection
export async function withRetry<T>(
	operation: () => Promise<T>,
	operationName = "Database operation",
	retries = 3,
): Promise<T> {
	let lastError: unknown;
	const operationId = ++operationCounter;

	// Check circuit breaker first
	if (circuitBreakerOpen) {
		const now = Date.now();
		if (now < circuitBreakerResetTime) {
			logger.warn(
				`Circuit breaker open, operation "${operationName}" rejected`,
			);
			throw new Error("Database circuit breaker open - please try again later");
		}
	}

	for (let attempt = 1; attempt <= retries; attempt++) {
		// Track the operation
		const operationStart = Date.now();
		activeOperations.set(operationId, {
			name: operationName,
			startTime: operationStart,
		});

		// Create a timeout promise
		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => {
				reject(
					new Error(`${operationName} timeout after ${OPERATION_TIMEOUT_MS}ms`),
				);
			}, OPERATION_TIMEOUT_MS);
		});

		try {
			// Check connection before operation
			if (!isConnected) {
				await connectWithRetry();
			}

			// Execute the database operation with timeout
			const startTime = Date.now();
			const operationPromise = operation();

			const result = (await Promise.race([
				operationPromise,
				timeoutPromise,
			])) as T;

			const duration = Date.now() - startTime;

			// Log slow operations (separate from query logging)
			if (duration > SLOW_QUERY_THRESHOLD_MS) {
				logger.warn(`Slow ${operationName} (${duration}ms)`);
			}

			// Operation completed, remove from tracking
			activeOperations.delete(operationId);

			// Reset failure counter on success
			consecutiveFailures = 0;

			return result;
		} catch (error) {
			// Clean up tracking regardless of error
			activeOperations.delete(operationId);

			lastError = error;

			// Check if it's a timeout error from our Promise.race
			if (error instanceof Error && error.message.includes("timeout after")) {
				logger.warn(`${operationName} query timeout`);
				// Let's count timeouts as connection errors
				isConnected = false;
			}

			// Check if it's a connection error
			if (isConnectionError(error)) {
				consecutiveFailures++;
				logger.warn(
					`${operationName} failed due to connection issue (attempt ${attempt}/${retries}): ${error instanceof Error ? error.message : "Unknown error"}`,
				);

				// Check if circuit breaker should trip
				if (consecutiveFailures >= CIRCUIT_BREAKER_THRESHOLD) {
					circuitBreakerOpen = true;
					circuitBreakerResetTime = Date.now() + CIRCUIT_BREAKER_RESET_TIMEOUT;
					logger.error(
						`Circuit breaker tripped after ${consecutiveFailures} consecutive failures`,
					);
					throw new Error(
						"Database circuit breaker tripped - service temporarily unavailable",
					);
				}

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

// Add function to monitor and report on hanging operations
function startOperationMonitoring() {
	const CHECK_INTERVAL = 5000; // Check every 5 seconds
	const HANGING_THRESHOLD = 30000; // Flag operations running over 30 seconds

	setInterval(() => {
		const now = Date.now();
		activeOperations.forEach((op, id) => {
			const duration = now - op.startTime;
			if (duration > HANGING_THRESHOLD) {
				logger.warn(
					`Potential hanging operation: ${op.name} running for ${Math.round(duration / 1000)}s (ID: ${id})`,
				);
			}
		});
	}, CHECK_INTERVAL);
}

// Start the operation monitoring
startOperationMonitoring();

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
