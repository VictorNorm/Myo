import { muscleGroupRepository } from "./repositories/muscleGroupRepository";
import logger from "./logger";

export const muscleGroupService = {
	getAllMuscleGroups: async () => {
		logger.debug("Fetching all muscle groups");
		
		try {
			const muscleGroups = await muscleGroupRepository.findAll();
			
			logger.debug("Successfully fetched muscle groups", {
				count: muscleGroups.length
			});
			
			return muscleGroups;
		} catch (error) {
			logger.error("Failed to fetch muscle groups", {
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined
			});
			throw error;
		}
	},

	getMuscleGroupById: async (id: number) => {
		logger.debug("Fetching muscle group by ID", { id });
		
		try {
			const muscleGroup = await muscleGroupRepository.findById(id);
			
			if (!muscleGroup) {
				logger.warn("Muscle group not found", { id });
				return null;
			}
			
			logger.debug("Successfully fetched muscle group", { id, name: muscleGroup.name });
			return muscleGroup;
		} catch (error) {
			logger.error("Failed to fetch muscle group", {
				id,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined
			});
			throw error;
		}
	},

	createMuscleGroup: async (data: { name: string }) => {
		logger.debug("Creating muscle group", { name: data.name });
		
		try {
			const muscleGroup = await muscleGroupRepository.create(data);
			
			logger.info("Successfully created muscle group", {
				id: muscleGroup.id,
				name: muscleGroup.name
			});
			
			return muscleGroup;
		} catch (error) {
			logger.error("Failed to create muscle group", {
				name: data.name,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined
			});
			throw error;
		}
	},

	updateMuscleGroup: async (id: number, data: { name?: string }) => {
		logger.debug("Updating muscle group", { id, updates: data });
		
		try {
			const muscleGroup = await muscleGroupRepository.update(id, data);
			
			logger.info("Successfully updated muscle group", {
				id: muscleGroup.id,
				name: muscleGroup.name
			});
			
			return muscleGroup;
		} catch (error) {
			logger.error("Failed to update muscle group", {
				id,
				updates: data,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined
			});
			throw error;
		}
	},

	deleteMuscleGroup: async (id: number) => {
		logger.debug("Deleting muscle group", { id });
		
		try {
			await muscleGroupRepository.delete(id);
			
			logger.info("Successfully deleted muscle group", { id });
		} catch (error) {
			logger.error("Failed to delete muscle group", {
				id,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined
			});
			throw error;
		}
	}
};