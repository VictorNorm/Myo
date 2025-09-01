import { userRepository, type UserDetail, type UserProfile } from "./repositories/userRepository";
import logger from "./logger";

// Helper function to check user access permissions
const checkUserAccessPermission = (
	requestedUserId: number,
	requestingUser: { id: number; role: string; },
	targetUser: UserProfile
): boolean => {
	// Admin can access any user
	if (requestingUser.role === "ADMIN") {
		logger.debug("Access granted: Admin access", {
			requestingUserId: requestingUser.id,
			requestedUserId
		});
		return true;
	}

	// User can access their own profile
	if (requestingUser.id === requestedUserId) {
		logger.debug("Access granted: Self access", {
			requestingUserId: requestingUser.id,
			requestedUserId
		});
		return true;
	}

	// Trainer can access their assigned users
	if (requestingUser.role === "TRAINER" && targetUser.trainerId === requestingUser.id) {
		logger.debug("Access granted: Trainer access to assigned user", {
			requestingUserId: requestingUser.id,
			requestedUserId,
			trainerId: targetUser.trainerId
		});
		return true;
	}

	return false;
};

export const userService = {
	// Get all users with data transformation to UserDetail format
	getAllUsers: async (): Promise<UserDetail[]> => {
		logger.debug("Fetching all users");
		
		try {
			const users = await userRepository.findAllUsers();
			
			// Transform users to UserDetail format (matching original behavior)
			const userDetails: UserDetail[] = users.map(user => ({
				id: user.id,
				firstName: user.firstname,
				lastName: user.lastname,
				username: user.username,
			}));
			
			logger.debug("Successfully fetched and transformed users", {
				count: userDetails.length
			});
			
			return userDetails;
		} catch (error) {
			logger.error("Failed to fetch users", {
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined
			});
			throw error;
		}
	},

	// Get user by ID with authorization check
	getUserById: async (
		id: number, 
		requestingUser: { id: number; role: string; }
	): Promise<UserProfile | null> => {
		logger.debug("Fetching user by ID", { 
			requestedUserId: id,
			requestingUserId: requestingUser.id,
			requestingUserRole: requestingUser.role
		});
		
		try {
			const user = await userRepository.findUserById(id);
			
			if (!user) {
				logger.warn("User not found", {
					requestedUserId: id,
					requestingUserId: requestingUser.id
				});
				return null;
			}

			// Check authorization
			const isAuthorized = checkUserAccessPermission(
				id, 
				requestingUser, 
				user
			);

			if (!isAuthorized) {
				logger.warn("Unauthorized user details access attempt", {
					requestedUserId: id,
					requestingUserId: requestingUser.id,
					requestingUserRole: requestingUser.role
				});
				throw new Error("Unauthorized to view this user");
			}

			logger.debug("User details accessed successfully", {
				requestedUserId: id,
				requestingUserId: requestingUser.id,
				requestingUserRole: requestingUser.role
			});

			return user;
		} catch (error) {
			logger.error("Failed to fetch user by ID", {
				requestedUserId: id,
				requestingUserId: requestingUser.id,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined
			});
			throw error;
		}
	},

	// Assign user to trainer
	assignUserToTrainer: async (
		userId: number, 
		trainerId: number
	): Promise<void> => {
		logger.debug("Assigning user to trainer", { 
			userId, 
			trainerId 
		});
		
		try {
			// Check if user exists
			const userExists = await userRepository.userExists(userId);
			if (!userExists) {
				throw new Error("User not found");
			}

			// Check if trainer exists 
			const trainerExists = await userRepository.userExists(trainerId);
			if (!trainerExists) {
				throw new Error("Trainer not found");
			}

			await userRepository.assignUserToTrainer(userId, trainerId);
			
			logger.info("User successfully assigned to trainer", {
				userId,
				trainerId
			});
		} catch (error) {
			logger.error("Failed to assign user to trainer", {
				userId,
				trainerId,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined
			});
			throw error;
		}
	},

	// Get users assigned to a trainer
	getUsersByTrainer: async (trainerId: number): Promise<UserDetail[]> => {
		logger.debug("Fetching users by trainer", { trainerId });
		
		try {
			const users = await userRepository.findUsersByTrainer(trainerId);
			
			// Transform to UserDetail format
			const userDetails: UserDetail[] = users.map(user => ({
				id: user.id,
				firstName: user.firstname,
				lastName: user.lastname,
				username: user.username,
			}));
			
			logger.debug("Successfully fetched users by trainer", {
				trainerId,
				count: userDetails.length
			});
			
			return userDetails;
		} catch (error) {
			logger.error("Failed to fetch users by trainer", {
				trainerId,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined
			});
			throw error;
		}
	}
};