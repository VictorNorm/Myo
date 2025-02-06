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

const MAX_REPS = 20;
const BODYWEIGHT_MAX_REPS = 15; // Before considering adding weight
const SPECIAL_BODYWEIGHT_EXERCISES = [
	"PULL UP",
	"CHIN UP",
	"DIP",
	"PUSH UP",
	"PUSH UP DEFICIT",
];

function isSpecialBodyweightExercise(exerciseName: string): boolean {
	return SPECIAL_BODYWEIGHT_EXERCISES.includes(exerciseName.toUpperCase());
}

function getWeightIncrement(
	currentWeight: number,
	equipment: ExerciseData["equipment_type"],
): number {
	if (equipment === "BARBELL") return 2.5;
	return currentWeight < 10 ? 1 : 2;
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

function calculateStrengthProgression(data: ExerciseData): ProgressionResult {
	// Handle special bodyweight exercises differently
	if (
		data.equipment_type === "BODYWEIGHT" &&
		isSpecialBodyweightExercise(data.exercise_name)
	) {
		return calculateBodyweightProgression(data);
	}

	const increment = getWeightIncrement(data.weight, data.equipment_type);

	switch (data.rating) {
		case 1: // Very easy
			return { newWeight: data.weight + increment * 4, newReps: data.reps };
		case 2: // Easy
			return { newWeight: data.weight + increment * 2, newReps: data.reps };
		case 3: // Moderate
			return { newWeight: data.weight + increment, newReps: data.reps };
		case 4: // Hard
			return { newWeight: data.weight, newReps: data.reps };
		case 5: // Too hard
			return { newWeight: data.weight - increment * 2, newReps: data.reps };
		default:
			return { newWeight: data.weight, newReps: data.reps };
	}
}

function calculateVolumeIncrease(
	data: ExerciseData,
	type: "weight" | "reps",
): number {
	const increment = getWeightIncrement(data.weight, data.equipment_type);
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
): ProgressionResult {
	// Handle special bodyweight exercises differently
	if (
		data.equipment_type === "BODYWEIGHT" &&
		isSpecialBodyweightExercise(data.exercise_name)
	) {
		return calculateBodyweightProgression(data);
	}

	const increment = getWeightIncrement(data.weight, data.equipment_type);

	// For compound movements (except special bodyweight exercises), prioritize weight increases
	if (data.is_compound) {
		return calculateStrengthProgression(data);
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
			const volumeIncreaseWeight = calculateVolumeIncrease(data, "weight");
			const volumeIncreaseReps = calculateVolumeIncrease(data, "reps");
			return volumeIncreaseWeight > volumeIncreaseReps
				? { newWeight: data.weight + increment, newReps: data.reps }
				: { newWeight: data.weight, newReps: data.reps + 1 };
		}

		case 3: {
			// Moderate - choose smallest increase between weight and reps
			if (data.reps >= MAX_REPS) {
				return { newWeight: data.weight + increment, newReps: data.reps };
			}
			const weightIncrease = calculateVolumeIncrease(data, "weight");
			const repIncrease = calculateVolumeIncrease(data, "reps");
			return weightIncrease < repIncrease
				? { newWeight: data.weight + increment, newReps: data.reps }
				: { newWeight: data.weight, newReps: data.reps + 1 };
		}

		case 4: // Hard
			return { newWeight: data.weight, newReps: data.reps };

		case 5: // Too hard
			return { newWeight: data.weight - increment, newReps: data.reps };

		default:
			return { newWeight: data.weight, newReps: data.reps };
	}
}

export function calculateProgression(
	data: ExerciseData,
	programType: "STRENGTH" | "HYPERTROPHY",
): ProgressionResult {
	if (programType === "STRENGTH") {
		return calculateStrengthProgression(data);
	}
	return calculateHypertrophyProgression(data);
}

export type { ExerciseData, ProgressionResult };
