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
