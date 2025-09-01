import prisma from "../db";
import type { Decimal } from "@prisma/client/runtime/library";

// User settings interface matching Prisma schema
export interface UserSettings {
	user_id: number;
	createdAt: Date;
	updatedAt: Date;
	experienceLevel: string;
	barbellIncrement: Decimal;
	dumbbellIncrement: Decimal;
	cableIncrement: Decimal;
	machineIncrement: Decimal;
	useMetric: boolean;
	darkMode: boolean;
}

// User settings update data interface
export interface UserSettingsUpdateData {
	experienceLevel?: string;
	barbellIncrement?: number;
	dumbbellIncrement?: number;
	cableIncrement?: number;
	machineIncrement?: number;
	useMetric?: boolean;
	darkMode?: boolean;
}

// Program interface for current program lookup
export interface UserProgram {
	id: number;
	userId: number | null;
	goal: string;
	progressionSettings?: {
		experienceLevel: string;
		weeklyFrequency: number;
	} | null;
}

export const userSettingsRepository = {
	// Get user settings by user ID
	findByUserId: async (userId: number): Promise<UserSettings | null> => {
		return await prisma.user_settings.findUnique({
			where: {
				user_id: userId,
			},
		});
	},

	// Create default user settings
	createDefault: async (userId: number): Promise<UserSettings> => {
		return await prisma.user_settings.create({
			data: {
				user_id: userId,
				experienceLevel: "BEGINNER",
				barbellIncrement: 2.5,
				dumbbellIncrement: 2.0,
				cableIncrement: 2.5,
				machineIncrement: 5.0,
				useMetric: true,
				darkMode: true,
			},
		});
	},

	// Update user settings using upsert
	upsertSettings: async (userId: number, updateData: UserSettingsUpdateData): Promise<UserSettings> => {
		return await prisma.user_settings.upsert({
			where: {
				user_id: userId,
			},
			create: {
				user_id: userId,
				experienceLevel: (updateData.experienceLevel || "BEGINNER") as any,
				barbellIncrement: updateData.barbellIncrement || 2.5,
				dumbbellIncrement: updateData.dumbbellIncrement || 2.0,
				cableIncrement: updateData.cableIncrement || 2.5,
				machineIncrement: updateData.machineIncrement || 5.0,
				useMetric: updateData.useMetric !== undefined ? updateData.useMetric : true,
				darkMode: updateData.darkMode !== undefined ? updateData.darkMode : true,
			},
			update: {
				...(updateData.experienceLevel && { experienceLevel: updateData.experienceLevel as any }),
				...(updateData.barbellIncrement && { barbellIncrement: updateData.barbellIncrement }),
				...(updateData.dumbbellIncrement && { dumbbellIncrement: updateData.dumbbellIncrement }),
				...(updateData.cableIncrement && { cableIncrement: updateData.cableIncrement }),
				...(updateData.machineIncrement && { machineIncrement: updateData.machineIncrement }),
				...(updateData.useMetric !== undefined && { useMetric: updateData.useMetric }),
				...(updateData.darkMode !== undefined && { darkMode: updateData.darkMode }),
			},
		});
	},

	// Get user's current active program
	findCurrentProgram: async (userId: number): Promise<UserProgram | null> => {
		return await prisma.programs.findFirst({
			where: {
				userId: userId,
				endDate: null,
			},
			include: {
				progressionSettings: true,
			},
		});
	},

	// Create default program for user
	createDefaultProgram: async (userId: number): Promise<UserProgram> => {
		return await prisma.programs.create({
			data: {
				name: "Default Program",
				userId: userId,
				goal: "HYPERTROPHY",
				programType: "AUTOMATED",
			},
		});
	},

	// Update program progression settings
	upsertProgramProgressionSettings: async (
		programId: number, 
		experienceLevel: string
	): Promise<void> => {
		await prisma.program_progression_settings.upsert({
			where: {
				program_id: programId,
			},
			create: {
				program_id: programId,
				experienceLevel: experienceLevel as any,
				weeklyFrequency: 3, // Default value
			},
			update: {
				experienceLevel: experienceLevel as any,
			},
		});
	},

	// Check if user exists
	userExists: async (userId: number): Promise<boolean> => {
		const user = await prisma.users.findUnique({
			where: { id: userId },
			select: { id: true }
		});
		return user !== null;
	}
};