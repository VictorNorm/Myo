import { 
	progressionRepository, 
	type ExerciseBaseline, 
	type CurrentTemplate, 
	type LastCompleted, 
	type ProgressionHistory 
} from "./repositories/progressionRepository";
import logger from "./logger";

// Response interfaces for API
export interface ExerciseProgressionResponse {
	baseline: {
		sets: number;
		reps: number;
		weight: number;
	} | null;
	current: {
		sets: number;
		reps: number;
		weight: number;
	} | null;
	lastCompleted: {
		sets: number;
		reps: number;
		weight: string;
		rating: number | null;
		completedAt: Date;
	} | null;
	progressionHistory: ProgressionHistory[];
}

export interface WorkoutProgressionResponse {
	exercise_id: number;
	name: string;
	baseline: {
		sets: number;
		reps: number;
		weight: number;
	} | null;
	current: {
		sets: number;
		reps: number;
		weight: number;
	};
	lastCompleted: {
		sets: number;
		reps: number;
		weight: string;
		rating: number | null;
		completedAt: Date;
	} | null;
}

export const progressionService = {
	// Get progression history for a specific exercise in a workout
	getExerciseProgression: async (
		workoutId: number,
		exerciseId: number,
		userId: number
	): Promise<ExerciseProgressionResponse> => {
		logger.debug("Fetching exercise progression", {
			workoutId,
			exerciseId,
			userId
		});

		try {
			// Get workout and validate it has a program
			const workout = await progressionRepository.findWorkoutById(workoutId);

			if (!workout || !workout.program_id) {
				throw new Error("Workout not found or has no program");
			}

			const programId = workout.program_id;

			// Fetch all progression data in parallel
			const [baseline, progressionHistory, currentTemplate, lastCompleted] = await Promise.all([
				progressionRepository.findExerciseBaseline(exerciseId, userId, programId),
				progressionRepository.findProgressionHistory(exerciseId, userId, programId, 10),
				progressionRepository.findCurrentTemplate(workoutId, exerciseId),
				progressionRepository.findLastCompleted(exerciseId, userId, programId)
			]);

			logger.debug("Fetched progression history for specific exercise", {
				workoutId,
				exerciseId,
				userId,
				programId,
				historyCount: progressionHistory.length,
				hasBaseline: !!baseline,
				hasLastCompleted: !!lastCompleted,
			});

			return {
				baseline: baseline ? {
					sets: baseline.sets,
					reps: baseline.reps,
					weight: Number(baseline.weight),
				} : null,
				current: currentTemplate ? {
					sets: currentTemplate.sets || 0,
					reps: currentTemplate.reps || 0,
					weight: Number(currentTemplate.weight || 0),
				} : null,
				lastCompleted: lastCompleted ? {
					sets: lastCompleted.sets,
					reps: lastCompleted.reps,
					weight: String(lastCompleted.weight),
					rating: lastCompleted.rating,
					completedAt: lastCompleted.completedAt,
				} : null,
				progressionHistory,
			};
		} catch (error) {
			logger.error("Failed to fetch exercise progression", {
				workoutId,
				exerciseId,
				userId,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}
	},

	// Get progression data for all exercises in a workout
	getWorkoutProgression: async (
		workoutId: number,
		userId: number
	): Promise<WorkoutProgressionResponse[]> => {
		logger.debug("Fetching workout progression", {
			workoutId,
			userId
		});

		try {
			// Get workout with exercises
			const workout = await progressionRepository.findWorkoutWithExercises(workoutId);

			if (!workout || !workout.program_id) {
				throw new Error("Workout not found or has no program");
			}

			const programId = workout.program_id;
			const exerciseIds = workout.workout_exercises.map(ex => ex.exercise_id);

			// Fetch baselines and last completed exercises in batches for efficiency
			const [baselines, lastCompletedResults] = await Promise.all([
				progressionRepository.findMultipleExerciseBaselines(exerciseIds, userId, programId),
				progressionRepository.findMultipleLastCompleted(exerciseIds, userId, programId)
			]);

			// Create lookup maps for efficient data retrieval
			const baselineMap = new Map(baselines.map(b => [b.exercise_id, b]));
			const lastCompletedMap = new Map(
				lastCompletedResults.map(lc => [lc.exerciseId, lc])
			);

			// Build progression data for each exercise
			const progressionData: WorkoutProgressionResponse[] = workout.workout_exercises.map(exercise => {
				const baseline = baselineMap.get(exercise.exercise_id);
				const lastCompleted = lastCompletedMap.get(exercise.exercise_id);

				return {
					exercise_id: exercise.exercise_id,
					name: exercise.exercises.name,
					baseline: baseline ? {
						sets: baseline.sets,
						reps: baseline.reps,
						weight: Number(baseline.weight),
					} : null,
					current: {
						sets: exercise.sets || 0,
						reps: exercise.reps || 0,
						weight: Number(exercise.weight || 0),
					},
					lastCompleted: lastCompleted ? {
						sets: lastCompleted.sets,
						reps: lastCompleted.reps,
						weight: String(lastCompleted.weight),
						rating: lastCompleted.rating,
						completedAt: lastCompleted.completedAt,
					} : null,
				};
			});

			logger.debug("Fetched progression data for entire workout", {
				workoutId,
				userId,
				programId,
				exerciseCount: workout.workout_exercises.length,
				returnedExerciseCount: progressionData.length,
			});

			return progressionData;
		} catch (error) {
			logger.error("Failed to fetch workout progression", {
				workoutId,
				userId,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined,
			});
			throw error;
		}
	},

	// Validate workout access for user (simplified - just check if workout exists)
	validateWorkoutAccess: async (workoutId: number, userId: number): Promise<boolean> => {
		try {
			const workout = await progressionRepository.findWorkoutById(workoutId);
			// For now, just check if workout exists. 
			// Full authorization should be handled by middleware or separate service
			return !!workout;
		} catch (error) {
			logger.error("Failed to validate workout access", {
				workoutId,
				userId,
				error: error instanceof Error ? error.message : "Unknown error",
			});
			return false;
		}
	},

	// Get progression statistics for an exercise
	getProgressionStats: async (
		exerciseId: number,
		userId: number,
		programId: number
	): Promise<{
		totalProgressions: number;
		averageWeightIncrease: number;
		averageRepsIncrease: number;
		lastProgressionDate: Date | null;
	}> => {
		logger.debug("Calculating progression stats", {
			exerciseId,
			userId,
			programId
		});

		try {
			const progressionHistory = await progressionRepository.findProgressionHistory(
				exerciseId, 
				userId, 
				programId, 
				100 // Get more history for stats
			);

			if (progressionHistory.length === 0) {
				return {
					totalProgressions: 0,
					averageWeightIncrease: 0,
					averageRepsIncrease: 0,
					lastProgressionDate: null,
				};
			}

			const weightIncreases = progressionHistory
				.map(p => Number(p.newWeight) - Number(p.oldWeight))
				.filter(increase => increase > 0);

			const repsIncreases = progressionHistory
				.map(p => p.newReps - p.oldReps)
				.filter(increase => increase > 0);

			const averageWeightIncrease = weightIncreases.length > 0 
				? weightIncreases.reduce((a, b) => a + b, 0) / weightIncreases.length 
				: 0;

			const averageRepsIncrease = repsIncreases.length > 0
				? repsIncreases.reduce((a, b) => a + b, 0) / repsIncreases.length
				: 0;

			return {
				totalProgressions: progressionHistory.length,
				averageWeightIncrease,
				averageRepsIncrease,
				lastProgressionDate: progressionHistory[0]?.createdAt || null,
			};
		} catch (error) {
			logger.error("Failed to calculate progression stats", {
				exerciseId,
				userId,
				programId,
				error: error instanceof Error ? error.message : "Unknown error",
			});
			throw error;
		}
	}
};