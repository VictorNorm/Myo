import {
	calculateProgression,
	roundToClosestIncrement,
} from "./progressionCalculator";

import type {
	ExerciseData,
	ProgressionResult,
	UserEquipmentSettings,
	EquipmentType,
	ExperienceLevel,
	Goal,
	ProgressionHistory,
	ProgressionPreview,
} from "../../types/types";

// Re-export everything needed for the progression system
export { calculateProgression, roundToClosestIncrement };

export type {
	ExerciseData,
	ProgressionResult,
	UserEquipmentSettings,
	EquipmentType,
	ExperienceLevel,
	Goal,
	ProgressionHistory,
	ProgressionPreview,
};

// Export the new services
export { exerciseService } from "./exerciseService";
export { workoutService } from "./workoutService";
export { muscleGroupService } from "./muscleGroupService";
export { userService } from "./userService";
export { userSettingsService } from "./userSettingsService";
export { progressionService } from "./progressionService";

// Export the prisma db singleton
export { default as db } from "./db";