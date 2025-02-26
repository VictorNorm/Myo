import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedUser } from "../../types/types";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Generic resource ownership verification function
 * Maps resource types to their database queries
 */
async function verifyResourceOwnership(
	resourceType: string,
	resourceId: number,
	userId: number,
): Promise<boolean> {
	try {
		switch (resourceType) {
			case "program": {
				const program = await prisma.programs.findUnique({
					where: { id: resourceId },
					select: { userId: true },
				});
				return program?.userId === userId;
			}

			case "workout": {
				const workout = await prisma.workouts.findUnique({
					where: { id: resourceId },
					select: { program_id: true },
				});

				if (workout && workout.program_id !== null) {
					const program = await prisma.programs.findUnique({
						where: { id: workout.program_id },
						select: { userId: true },
					});
					return program?.userId === userId;
				}
				return false;
			}

			case "exercise":
				// Add logic for exercises ownership
				// Similar pattern: trace back to the user through related tables
				return false;

			// Add more resource types as your app grows

			default:
				console.warn(`Unknown resource type: ${resourceType}`);
				return false;
		}
	} catch (error) {
		console.error(`Error verifying ownership of ${resourceType}:`, error);
		return false;
	}
}

/**
 * Factory function that creates a middleware for specific resource authorization
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
				return res.status(401).json({ error: "Authentication required" });
			}

			// Admin bypass check
			if (adminBypass && currentUser.role === "ADMIN") {
				return next();
			}

			// Case 1: Check if userId is explicitly provided in request
			const requestedUserId = req.body.userId || req.params.userId;
			if (requestedUserId) {
				const parsedUserId = Number.parseInt(requestedUserId);
				if (!Number.isNaN(parsedUserId) && currentUser.id === parsedUserId) {
					return next();
				}
			}

			// Case 2: Check custom userId extraction if provided
			if (extractUserId) {
				const customUserId = extractUserId(req);
				if (customUserId && currentUser.id === customUserId) {
					return next();
				}
			}

			// Case 3: Resource ownership verification
			if (resourceType && resourceIdParam) {
				const resourceId = Number.parseInt(req.params[resourceIdParam]);
				if (!Number.isNaN(resourceId)) {
					const isOwner = await verifyResourceOwnership(
						resourceType,
						resourceId,
						currentUser.id,
					);

					if (isOwner) {
						return next();
					}
				}
			}

			// If all authorization checks fail
			return res.status(403).json({
				error: "Not authorized to access or modify this resource",
			});
		} catch (error) {
			console.error("Error in authorization middleware:", error);
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
