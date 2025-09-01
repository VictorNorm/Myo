import { userSettingsRepository, type UserSettingsUpdateData } from "./repositories/userSettingsRepository";
import logger from "./logger";

// Settings response interface
export interface UserSettingsResponse {
	experienceLevel: string;
	barbellIncrement: number;
	dumbbellIncrement: number;
	cableIncrement: number;
	machineIncrement: number;
	useMetric: boolean;
	darkMode: boolean;
	programGoal: string;
}

export const userSettingsService = {
	// Get user settings with program goal
	getUserSettings: async (userId: number): Promise<UserSettingsResponse> => {
		logger.debug("Fetching user settings", { userId });
		
		try {
			// Validate user exists
			const userExists = await userSettingsRepository.userExists(userId);
			if (!userExists) {
				throw new Error("User not found");
			}

			// Get user settings or create default if not exists
			let userSettings = await userSettingsRepository.findByUserId(userId);
			
			if (!userSettings) {
				logger.info("Creating default settings for user", { userId });
				userSettings = await userSettingsRepository.createDefault(userId);
			}

			// Get current program goal
			const currentProgram = await userSettingsRepository.findCurrentProgram(userId);
			const programGoal = currentProgram?.goal || "HYPERTROPHY";

			logger.debug("Fetched user settings successfully", {
				userId,
				experienceLevel: userSettings.experienceLevel,
				useMetric: userSettings.useMetric,
				hasProgramGoal: !!currentProgram?.goal,
			});

			// Return formatted response
			return {
				experienceLevel: userSettings.experienceLevel,
				barbellIncrement: Number(userSettings.barbellIncrement),
				dumbbellIncrement: Number(userSettings.dumbbellIncrement),
				cableIncrement: Number(userSettings.cableIncrement),
				machineIncrement: Number(userSettings.machineIncrement),
				useMetric: userSettings.useMetric,
				darkMode: userSettings.darkMode,
				programGoal: programGoal,
			};
		} catch (error) {
			logger.error("Failed to fetch user settings", {
				userId,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}
	},

	// Update user settings
	updateUserSettings: async (
		userId: number, 
		updateData: UserSettingsUpdateData
	): Promise<UserSettingsResponse> => {
		logger.debug("Updating user settings", {
			userId,
			fieldsToUpdate: {
				experienceLevel: updateData.experienceLevel !== undefined,
				barbellIncrement: updateData.barbellIncrement !== undefined,
				dumbbellIncrement: updateData.dumbbellIncrement !== undefined,
				cableIncrement: updateData.cableIncrement !== undefined,
				machineIncrement: updateData.machineIncrement !== undefined,
				useMetric: updateData.useMetric !== undefined,
				darkMode: updateData.darkMode !== undefined,
			},
		});

		try {
			// Validate user exists
			const userExists = await userSettingsRepository.userExists(userId);
			if (!userExists) {
				throw new Error("User not found");
			}

			// Update user settings
			const updatedSettings = await userSettingsRepository.upsertSettings(userId, updateData);

			// Handle experience level changes with program progression settings
			if (updateData.experienceLevel) {
				await userSettingsService.updateProgramProgressionSettings(userId, updateData.experienceLevel);
			}

			// Get program goal for response
			const currentProgram = await userSettingsRepository.findCurrentProgram(userId);
			const programGoal = currentProgram?.goal || "HYPERTROPHY";

			logger.info("User settings updated successfully", {
				userId,
				experienceLevel: updatedSettings.experienceLevel,
				updateProgramSettings: updateData.experienceLevel !== undefined,
			});

			return {
				experienceLevel: updatedSettings.experienceLevel,
				barbellIncrement: Number(updatedSettings.barbellIncrement),
				dumbbellIncrement: Number(updatedSettings.dumbbellIncrement),
				cableIncrement: Number(updatedSettings.cableIncrement),
				machineIncrement: Number(updatedSettings.machineIncrement),
				useMetric: updatedSettings.useMetric,
				darkMode: updatedSettings.darkMode,
				programGoal: programGoal,
			};
		} catch (error) {
			logger.error("Failed to update user settings", {
				userId,
				updateData,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}
	},

	// Update program progression settings when experience level changes
	updateProgramProgressionSettings: async (
		userId: number, 
		experienceLevel: string
	): Promise<void> => {
		logger.debug("Updating program progression settings with new experience level", {
			userId,
			experienceLevel,
		});

		try {
			// Get or create current program
			let currentProgram = await userSettingsRepository.findCurrentProgram(userId);

			if (!currentProgram) {
				// Create a default program if none exists
				logger.info("Creating default program for user settings", { userId });
				currentProgram = await userSettingsRepository.createDefaultProgram(userId);
			}

			// Update program progression settings
			await userSettingsRepository.upsertProgramProgressionSettings(
				currentProgram.id, 
				experienceLevel
			);

			logger.debug("Program progression settings updated successfully", {
				userId,
				programId: currentProgram.id,
				experienceLevel,
			});
		} catch (error) {
			logger.error("Failed to update program progression settings", {
				userId,
				experienceLevel,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}
	},

	// Validate settings update data
	validateUpdateData: (updateData: any): string[] => {
		const errors: string[] = [];

		// Validate experienceLevel
		if (updateData.experienceLevel !== undefined) {
			const validExperienceLevels = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
			if (!validExperienceLevels.includes(updateData.experienceLevel)) {
				errors.push("Experience level must be BEGINNER, INTERMEDIATE, or ADVANCED");
			}
		}

		// Validate increments (must be positive numbers)
		const incrementFields = [
			"barbellIncrement", 
			"dumbbellIncrement", 
			"cableIncrement", 
			"machineIncrement"
		];
		
		for (const field of incrementFields) {
			if (updateData[field] !== undefined) {
				const value = Number(updateData[field]);
				if (isNaN(value) || value <= 0 || value > 100) {
					errors.push(`${field} must be a positive number between 0 and 100`);
				}
			}
		}

		// Validate boolean fields
		const booleanFields = ["useMetric", "darkMode"];
		for (const field of booleanFields) {
			if (updateData[field] !== undefined && typeof updateData[field] !== "boolean") {
				errors.push(`${field} must be a boolean value`);
			}
		}

		return errors;
	}
};