// services/progressionCalculator.ts

interface ExerciseData {
	sets: number;
	reps: number;
	weight: number;
	rating: number;
	equipment_type: "DUMBBELL" | "BARBELL" | "CABLE" | "MACHINE" | "BODYWEIGHT";
	is_compound: boolean;
	exercise_name: string;
}

interface ProgressionResult {
	newWeight: number;
	newReps: number;
	deload?: boolean;
}

interface UserEquipmentSettings {
	barbellIncrement: number;
	dumbbellIncrement: number;
	cableIncrement: number;
	machineIncrement: number;
	experienceLevel?: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
}

const MAX_REPS = 20;
const BODYWEIGHT_MAX_REPS = 15; // Before considering adding weight
const SPECIAL_BODYWEIGHT_EXERCISES = [
	"PULL UP",
	"CHIN UP",
	"DIP",
	"PUSH UP",
	"PUSH UP DEFICIT",
];

const DEFAULT_EQUIPMENT_SETTINGS: UserEquipmentSettings = {
	barbellIncrement: 2.5,
	dumbbellIncrement: 2.0,
	cableIncrement: 2.5,
	machineIncrement: 5.0,
	experienceLevel: "BEGINNER",
};

function isSpecialBodyweightExercise(exerciseName: string): boolean {
	return SPECIAL_BODYWEIGHT_EXERCISES.includes(exerciseName.toUpperCase());
}

/**
 * Gets user's preferred increment for the given equipment type
 */
function getPreferredIncrement(
	equipmentType: ExerciseData["equipment_type"],
	userSettings: UserEquipmentSettings = DEFAULT_EQUIPMENT_SETTINGS,
): number {
	switch (equipmentType) {
		case "BARBELL":
			return (
				userSettings.barbellIncrement ||
				DEFAULT_EQUIPMENT_SETTINGS.barbellIncrement
			);
		case "DUMBBELL":
			return (
				userSettings.dumbbellIncrement ||
				DEFAULT_EQUIPMENT_SETTINGS.dumbbellIncrement
			);
		case "CABLE":
			return (
				userSettings.cableIncrement || DEFAULT_EQUIPMENT_SETTINGS.cableIncrement
			);
		case "MACHINE":
			return (
				userSettings.machineIncrement ||
				DEFAULT_EQUIPMENT_SETTINGS.machineIncrement
			);
		case "BODYWEIGHT":
			return (
				userSettings.dumbbellIncrement ||
				DEFAULT_EQUIPMENT_SETTINGS.dumbbellIncrement
			); // Use dumbbell increment for weighted bodyweight
		default:
			return 2.5; // Fallback
	}
}

/**
 * Gets equipment-specific increments from user settings
 */
function getEquipmentIncrements(
	equipmentType: ExerciseData["equipment_type"],
	userSettings: UserEquipmentSettings = DEFAULT_EQUIPMENT_SETTINGS,
): number[] {
	// Define standard increments available for each equipment type
	const standardIncrements = {
		BARBELL: [1.25, 2.5, 5.0, 10.0],
		DUMBBELL: [1.0, 2.0, 2.5, 5.0],
		CABLE: [2.0, 2.5, 5.0, 10.0],
		MACHINE: [2.5, 5.0, 10.0],
		BODYWEIGHT: [1.0, 2.5, 5.0], // For weighted bodyweight exercises
	};

	// Get user's preferred increment for this equipment type
	const preferredIncrement = getPreferredIncrement(equipmentType, userSettings);

	// Return equipment's standard increments with preferred increment first
	return [
		preferredIncrement,
		...standardIncrements[equipmentType].filter(
			(inc) => inc !== preferredIncrement,
		),
	];
}

/**
 * Finds the closest available increment to the desired raw increment
 */
function findClosestIncrement(
	rawIncrement: number,
	availableIncrements: number[],
): number {
	// If rawIncrement is smaller than smallest available increment, return smallest
	if (rawIncrement <= availableIncrements[0]) {
		return availableIncrements[0];
	}

	// Find closest increment by minimizing absolute difference
	return availableIncrements.reduce((prev, curr) =>
		Math.abs(curr - rawIncrement) < Math.abs(prev - rawIncrement) ? curr : prev,
	);
}

/**
 * Determines the appropriate standard increment based on exercise type, weight and experience level
 */
function getStandardIncrement(
	currentWeight: number,
	equipmentType: ExerciseData["equipment_type"],
	isCompound: boolean,
	userSettings: UserEquipmentSettings = DEFAULT_EQUIPMENT_SETTINGS,
): number {
	// Get available increments for this equipment type
	const availableIncrements = getEquipmentIncrements(
		equipmentType,
		userSettings,
	);
	const sortedIncrements = [...availableIncrements].sort((a, b) => a - b);
	const smallestIncrement = sortedIncrements[0] || 1.25;

	// Base increment size on exercise type and current weight
	let rawIncrement: number;

	if (isCompound) {
		// Compound movements (bench, squat, deadlift):
		if (currentWeight < 40) {
			rawIncrement = 5.0; // Under 40kg: 5kg increments
		} else if (currentWeight < 100) {
			rawIncrement = 2.5; // 40-100kg: 2.5kg increments
		} else {
			rawIncrement = 1.25; // Over 100kg: 1.25kg increments
		}
	} else {
		// Isolation movements (curls, lateral raises):
		if (currentWeight < 15) {
			rawIncrement = 2.5; // Under 15kg: 2.5kg increments
		} else {
			rawIncrement = 1.25; // Over 15kg: 1.25kg increments
		}
	}

	// Modify based on experience level
	const experienceLevel = userSettings?.experienceLevel || "BEGINNER";
	if (experienceLevel === "INTERMEDIATE" && currentWeight > 60) {
		// Intermediate lifters progress slower at higher weights
		rawIncrement = Math.max(smallestIncrement, rawIncrement * 0.5);
	} else if (experienceLevel === "ADVANCED") {
		// Advanced lifters progress slower overall
		rawIncrement = Math.max(smallestIncrement, rawIncrement * 0.5);
	}

	// Find the closest available increment
	return findClosestIncrement(rawIncrement, availableIncrements);
}

/**
 * Gets weight increment based on difficulty rating, equipment, weight and experience level
 */
function getWeightIncrement(
	currentWeight: number,
	equipment: ExerciseData["equipment_type"],
	isCompound: boolean,
	rating: number,
	userSettings?: UserEquipmentSettings,
): number {
	// Get the standard increment for this exercise/weight
	const standardIncrement = getStandardIncrement(
		currentWeight,
		equipment,
		isCompound,
		userSettings,
	);

	// Modify based on rating
	switch (rating) {
		case 1: // Very Easy - double the increment
			return standardIncrement * 2;
		case 2: // Easy - standard increment
		case 3: // Moderate - standard increment
			return standardIncrement;
		case 4: // Hard - no increase
			return 0;
		case 5: // Too Hard - decrease
			return -standardIncrement;
		default:
			return standardIncrement;
	}
}

function calculateBodyweightProgression(data: ExerciseData): ProgressionResult {
	switch (data.rating) {
		case 1: // Very easy
			return {
				newWeight: 0,
				newReps: Math.min(data.reps + 2, MAX_REPS),
			};
		case 2: // Easy
			return {
				newWeight: 0,
				newReps: Math.min(data.reps + 1, MAX_REPS),
			};
		case 3: // Moderate
			return {
				newWeight: 0,
				newReps: Math.min(data.reps + 1, MAX_REPS),
			};
		case 4: // Hard
			return {
				newWeight: 0,
				newReps: data.reps,
			};
		case 5: // Too hard
			return {
				newWeight: 0,
				newReps: Math.max(1, data.reps - 2),
			};
		default:
			return {
				newWeight: 0,
				newReps: data.reps,
			};
	}
}

function calculateStrengthProgression(
	data: ExerciseData,
	userSettings?: UserEquipmentSettings,
): ProgressionResult {
	// Handle special bodyweight exercises differently
	if (
		data.equipment_type === "BODYWEIGHT" &&
		isSpecialBodyweightExercise(data.exercise_name)
	) {
		return calculateBodyweightProgression(data);
	}

	const increment = getWeightIncrement(
		data.weight,
		data.equipment_type,
		data.is_compound,
		data.rating,
		userSettings,
	);

	// Apply the calculated increment
	return {
		newWeight: Math.max(0, data.weight + increment),
		newReps: data.reps,
	};
}

function calculateVolumeIncrease(
	data: ExerciseData,
	type: "weight" | "reps",
	userSettings?: UserEquipmentSettings,
): number {
	const increment = getWeightIncrement(
		data.weight,
		data.equipment_type,
		data.is_compound,
		Math.min(data.rating, 3), // Cap at 3 to always get a positive increment for comparison
		userSettings,
	);
	const currentVolume = data.sets * data.reps * data.weight;

	if (type === "weight") {
		return data.sets * data.reps * (data.weight + increment) - currentVolume;
	}
	// Only calculate rep increase if we're not at max reps
	if (data.reps >= MAX_REPS) {
		return Number.POSITIVE_INFINITY; // Force weight increase by making rep increase unfavorable
	}
	return data.sets * (data.reps + 1) * data.weight - currentVolume;
}

function calculateHypertrophyProgression(
	data: ExerciseData,
	userSettings?: UserEquipmentSettings,
): ProgressionResult {
	// Handle special bodyweight exercises differently
	if (
		data.equipment_type === "BODYWEIGHT" &&
		isSpecialBodyweightExercise(data.exercise_name)
	) {
		return calculateBodyweightProgression(data);
	}

	const increment = getWeightIncrement(
		data.weight,
		data.equipment_type,
		data.is_compound,
		data.rating,
		userSettings,
	);

	// For compound movements (except special bodyweight exercises), prioritize weight increases
	if (data.is_compound) {
		return calculateStrengthProgression(data, userSettings);
	}

	// For isolation exercises, implement progressive overload based on rating
	switch (data.rating) {
		case 1: {
			// Very easy
			const newReps = data.reps >= MAX_REPS ? data.reps : data.reps + 1;
			return {
				newWeight: data.weight + increment,
				newReps: newReps,
			};
		}

		case 2: {
			// Easy - increase either weight or reps (larger increase)
			if (data.reps >= MAX_REPS) {
				return { newWeight: data.weight + increment, newReps: data.reps };
			}
			const volumeIncreaseWeight = calculateVolumeIncrease(
				data,
				"weight",
				userSettings,
			);
			const volumeIncreaseReps = calculateVolumeIncrease(
				data,
				"reps",
				userSettings,
			);
			return volumeIncreaseWeight > volumeIncreaseReps
				? { newWeight: data.weight + increment, newReps: data.reps }
				: { newWeight: data.weight, newReps: data.reps + 1 };
		}

		case 3: {
			// Moderate - choose smallest increase between weight and reps
			if (data.reps >= MAX_REPS) {
				return { newWeight: data.weight + increment, newReps: data.reps };
			}
			const weightIncrease = calculateVolumeIncrease(
				data,
				"weight",
				userSettings,
			);
			const repIncrease = calculateVolumeIncrease(data, "reps", userSettings);
			return weightIncrease < repIncrease
				? { newWeight: data.weight + increment, newReps: data.reps }
				: { newWeight: data.weight, newReps: data.reps + 1 };
		}

		case 4: // Hard
			return { newWeight: data.weight, newReps: data.reps };

		case 5: // Too hard
			return {
				newWeight: Math.max(0, data.weight + increment),
				newReps: data.reps,
			};

		default:
			return { newWeight: data.weight, newReps: data.reps };
	}
}

/**
 * Main function to calculate progression based on exercise data and program type
 * Now accepts optional userSettings for equipment-specific increments
 */
export function calculateProgression(
	data: ExerciseData,
	programType: "STRENGTH" | "HYPERTROPHY",
	userSettings?: UserEquipmentSettings,
): ProgressionResult {
	if (programType === "STRENGTH") {
		return calculateStrengthProgression(data, userSettings);
	}
	return calculateHypertrophyProgression(data, userSettings);
}

/**
 * Helper function to round weight to closest available increment
 * Useful for client-side adjustments
 */
export function roundToClosestIncrement(
	weight: number,
	equipmentType: ExerciseData["equipment_type"],
	userSettings?: UserEquipmentSettings,
): number {
	const availableIncrements = getEquipmentIncrements(
		equipmentType,
		userSettings,
	);
	const preferredIncrement = availableIncrements[0];

	// Round to nearest multiple of preferred increment
	return Math.round(weight / preferredIncrement) * preferredIncrement;
}

export type { ExerciseData, ProgressionResult, UserEquipmentSettings };
