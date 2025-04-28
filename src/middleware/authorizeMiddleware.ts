import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedUser } from "../../types/types";
import { PrismaClient } from "@prisma/client";
import prisma from "../services/db";
import logger from "../services/logger";

/**
 * Generic resource ownership verification function
 * Maps resource types to their database queries
 * Optimized to reduce database lookups
 */
async function verifyResourceOwnership(
	resourceType: string,
	resourceId: number,
	userId: number,
): Promise<boolean> {
	try {
		switch (resourceType) {
			case "program": {
				// Simple direct query with index lookup
				const program = await prisma.programs.findUnique({
					where: { id: resourceId },
					select: { userId: true },
				});
				return program?.userId === userId;
			}

			case "workout": {
				// Single query with join to avoid N+1 pattern
				const result = await prisma.workouts.findFirst({
					where: { 
						id: resourceId,
						programs: {
							userId: userId
						}
					},
					select: { 
						id: true 
					},
					// Use inner join to ensure both conditions are met
					include: {
						programs: {
							select: {
								userId: true
							}
						}
					}
				});
				
				// If we found a matching workout, the user has access
				return !!result;
			}

			case "exercise":
				// Add logic for exercises ownership
				// Similar pattern: trace back to the user through related tables
				return false;

			// Add more resource types as your app grows

			default:
				logger.warn(`Unknown resource type: ${resourceType}`);
				return false;
		}
	} catch (error) {
		logger.error(`Error verifying ownership of ${resourceType}: ${error instanceof Error ? error.message : "Unknown error"}`, {
			stack: error instanceof Error ? error.stack : undefined,
			resourceType,
			resourceId,
			userId
		});
		return false;
	}
}

/**
 * Factory function that creates a middleware for specific resource authorization
 * Optimized to check admin role early and minimize database queries
 *
 * @param options Configuration options for the authorization
 * @returns Express middleware function
 */
function createAuthorizeMiddleware(options: {
	// The parameter to extract from req.params as the resource ID
	resourceIdParam?: string;
	// The resource type to verify ownership against
	resourceType?: string;
	// Function to extract userId from request (for complex cases)
	extractUserId?: (req: Request) => number | null | undefined;
	// Whether admin users bypass authorization
	adminBypass?: boolean;
}) {
	const {
		resourceIdParam,
		resourceType,
		extractUserId,
		adminBypass = true,
	} = options;

	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const currentUser = req.user as AuthenticatedUser;

			// No user in request means not authenticated
			if (!currentUser) {
				logger.warn("Authentication required but no user in request");
				return res.status(401).json({ error: "Authentication required" });
			}

			// OPTIMIZATION: Check admin role early to avoid unnecessary processing
			if (adminBypass && currentUser.role === "ADMIN") {
				return next();
			}

			// Start with fastest checks (in-memory) before expensive DB operations
			
			// Case 1: Check if userId is explicitly provided in request
			const requestedUserId = req.body.userId || req.params.userId;
			if (requestedUserId) {
				const parsedUserId = Number.parseInt(requestedUserId);
				if (!Number.isNaN(parsedUserId) && currentUser.id === parsedUserId) {
					return next();
				}
			}

			// Case 2: Check custom userId extraction if provided (still in-memory)
			if (extractUserId) {
				const customUserId = extractUserId(req);
				if (customUserId && currentUser.id === customUserId) {
					return next();
				}
			}

			// Case 3: Resource ownership verification (DB operation - do this last)
			if (resourceType && resourceIdParam) {
				const resourceId = Number.parseInt(req.params[resourceIdParam]);
				if (!Number.isNaN(resourceId)) {
					const start = Date.now();
					const isOwner = await verifyResourceOwnership(
						resourceType,
						resourceId,
						currentUser.id,
					);
					const elapsed = Date.now() - start;
					
					// Log slow ownership checks
					if (elapsed > 100) {
						logger.warn(`Slow ownership verification (${elapsed}ms)`, {
							resourceType,
							resourceId,
							userId: currentUser.id
						});
					}

					if (isOwner) {
						return next();
					}
				}
			}

			// If all authorization checks fail
			logger.warn("Authorization failed", {
				userId: currentUser.id,
				role: currentUser.role,
				resourceType,
				resourceId: resourceIdParam ? req.params[resourceIdParam] : undefined
			});
			
			return res.status(403).json({
				error: "Not authorized to access or modify this resource",
			});
		} catch (error) {
			logger.error(
				`Error in authorization middleware: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					userId: (req.user as AuthenticatedUser)?.id,
					resourceType,
					resourceIdParam
				}
			);
			return res.status(500).json({
				error: "Authorization check failed",
			});
		}
	};
}

/**
 * Predefined middleware for common authorization scenarios
 */
const authorizeMiddleware = {
	// Generic user access - checks if requested userId matches authenticated user
	userAccess: createAuthorizeMiddleware({}),

	// Program access - verifies the user owns the program
	programAccess: createAuthorizeMiddleware({
		resourceIdParam: "programId",
		resourceType: "program",
	}),

	// Workout access - verifies the user owns the workout via program
	workoutAccess: createAuthorizeMiddleware({
		resourceIdParam: "workoutId",
		resourceType: "workout",
	}),

	// Create custom middleware on-the-fly for specific routes
	custom: createAuthorizeMiddleware,
};

export default authorizeMiddleware;
