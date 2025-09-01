import prisma from "../db";

// User detail interface for transformed user data
export interface UserDetail {
	id: number;
	firstName: string;
	lastName: string;
	username: string;
}

// Full user interface for detailed user data
export interface UserProfile {
	id: number;
	firstname: string;
	lastname: string;
	username: string;
	role: string;
	trainerId: number | null;
	emailVerified: boolean;
	created_at: Date | null;
}

export const userRepository = {
	// Get all users with basic details
	findAllUsers: async (): Promise<UserProfile[]> => {
		return await prisma.users.findMany({
			select: {
				id: true,
				firstname: true,
				lastname: true,
				username: true,
				role: true,
				trainerId: true,
				emailVerified: true,
				created_at: true,
			},
			orderBy: {
				created_at: 'desc'
			}
		});
	},

	// Get user by ID with full profile data
	findUserById: async (id: number): Promise<UserProfile | null> => {
		return await prisma.users.findUnique({
			where: { id },
			select: {
				id: true,
				firstname: true,
				lastname: true,
				username: true,
				role: true,
				trainerId: true,
				emailVerified: true,
				created_at: true,
			},
		});
	},

	// Assign user to trainer
	assignUserToTrainer: async (userId: number, trainerId: number) => {
		return await prisma.users.update({
			where: { id: userId },
			data: { trainerId },
		});
	},

	// Get users assigned to a specific trainer
	findUsersByTrainer: async (trainerId: number): Promise<UserProfile[]> => {
		return await prisma.users.findMany({
			where: { trainerId },
			select: {
				id: true,
				firstname: true,
				lastname: true,
				username: true,
				role: true,
				trainerId: true,
				emailVerified: true,
				created_at: true,
			},
			orderBy: {
				created_at: 'desc'
			}
		});
	},

	// Check if user exists
	userExists: async (id: number): Promise<boolean> => {
		const user = await prisma.users.findUnique({
			where: { id },
			select: { id: true }
		});
		return user !== null;
	},

	// Get user's trainer relationship
	getUserTrainerRelation: async (userId: number): Promise<{ trainerId: number | null } | null> => {
		return await prisma.users.findUnique({
			where: { id: userId },
			select: { trainerId: true }
		});
	}
};