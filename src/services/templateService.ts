import { Prisma } from "@prisma/client";
import { 
	templateRepository,
	type ExerciseBaselineFromDB,
	type CompletedExerciseFromDB,
	type WorkoutWithProgram,
	type WorkoutExerciseWithDetails,
	type SupersetData
} from "./repositories/templateRepository";
import logger from "./logger";

// Response interfaces
export interface TemplateExerciseData {
	workout_id: number;
	exercise_id: number;
	sets: number | null;
	reps: number | null;
	weight: number;
	order: number | null;
	exercises: {
		id: number;
		name: string;
		equipment: string | null;
		category: string | null;
		videoUrl: string | null;
	};
	equipment_type: string | null;
	is_compound: boolean;
	superset_with: number | null;
	source: string;
}

export interface WorkoutTemplateResponse {
	exercises: TemplateExerciseData[];
	programType: string;
	programId: number | null;
	programName: string | undefined;
	programGoal: string;
}

export const templateService = {
	async getWorkoutTemplate(workoutId: number, userId: number): Promise<WorkoutTemplateResponse> {
		// Get workout with program details
		const workout = await templateRepository.getWorkoutWithProgram(workoutId);

		if (!workout) {
			throw new Error("Workout not found");
		}

		const programType = workout.programs?.programType || "MANUAL";
		const programId = workout.program_id;

		if (!programId) {
			throw new Error("Workout is not associated with a program");
		}

		// Get workout exercises with their details
		const workoutExercises = await templateRepository.getWorkoutExercisesWithDetails(workoutId);

		logger.warn(
			'🔍 Backend - Sample exercise with video URL:', workoutExercises[0]?.exercises,
		);
		logger.warn('🔍 Backend - Total exercises found:', workoutExercises.length);
		logger.warn('🔍 Backend - First exercise raw:', workoutExercises[0]);

		// Get supersets for this workout
		const supersets = await templateRepository.getSupersets(workoutId);

		// Create a map of exercise_id to its superset partner
		const supersetMap: Record<number, number> = {};
		for (const superset of supersets) {
			supersetMap[superset.first_exercise_id] = superset.second_exercise_id;
			supersetMap[superset.second_exercise_id] = superset.first_exercise_id;
		}

		logger.debug("Processing workout template", {
			workoutId,
			userId,
			programId,
			programType,
			exerciseCount: workoutExercises.length,
			supersetCount: supersets.length,
		});

		// Get baseline or completed exercise data based on program type
		const { baselineMap, lastCompletedMap } = await this.getExerciseData(
			programType,
			userId,
			programId,
			workoutId,
			workoutExercises
		);

		// Format the exercise data
		const templateData = this.formatExerciseData(
			workoutExercises,
			programType,
			baselineMap,
			lastCompletedMap,
			supersetMap
		);

		logger.debug("Successfully built workout template", {
			workoutId,
			userId,
			programId,
			programType,
			exerciseCount: templateData.length,
		});

		return {
			exercises: templateData,
			programType,
			programId: workout.program_id,
			programName: workout.programs?.name,
			programGoal: workout.programs?.goal || "HYPERTROPHY",
		};
	},

	async getExerciseData(
		programType: string,
		userId: number,
		programId: number,
		workoutId: number,
		workoutExercises: WorkoutExerciseWithDetails[]
	) {
		let exerciseBaselines: ExerciseBaselineFromDB[] = [];
		let lastCompletedExercises: CompletedExerciseFromDB[] = [];

		// Get user-specific baselines for AUTOMATED programs
		if (programType === "AUTOMATED") {
			const exerciseIds = workoutExercises.map((we) => we.exercise_id);
			exerciseBaselines = await templateRepository.getExerciseBaselines(
				userId, 
				programId, 
				exerciseIds
			);

			logger.debug("Retrieved exercise baselines for automated program", {
				baselineCount: exerciseBaselines.length,
				workoutId,
				programId,
			});
		}

		// For MANUAL programs, get the user's most recent completed exercises
		if (programType === "MANUAL") {
			lastCompletedExercises = await templateRepository.getLastCompletedExercises(
				userId, 
				workoutId
			);

			logger.debug("Retrieved last completed exercises for manual program", {
				completedExerciseCount: lastCompletedExercises.length,
				workoutId,
				userId,
			});
		}

		// Create maps for quick lookup
		const baselineMap = new Map(
			exerciseBaselines.map((baseline) => [baseline.exercise_id, baseline])
		);

		const lastCompletedMap = new Map(
			lastCompletedExercises.map((completed) => [
				completed.exercise_id,
				completed,
			])
		);

		return { baselineMap, lastCompletedMap };
	},

	formatExerciseData(
		workoutExercises: WorkoutExerciseWithDetails[],
		programType: string,
		baselineMap: Map<number, ExerciseBaselineFromDB>,
		lastCompletedMap: Map<number, CompletedExerciseFromDB>,
		supersetMap: Record<number, number>
	): TemplateExerciseData[] {
		return workoutExercises.map((exercise) => {
			let sets = exercise.sets;
			let reps = exercise.reps;
			let weight = exercise.weight;
			let weightValue: number;
			let source = "template";

			// For AUTOMATED programs, use baseline data if available
			if (programType === "AUTOMATED") {
				const baseline = baselineMap.get(exercise.exercise_id);
				if (baseline) {
					sets = baseline.sets;
					reps = baseline.reps;
					weight = baseline.weight;
					weightValue = Number(baseline.weight);
					source = "baseline";
				} else {
					weightValue = Number(weight);
				}
			}
			// For MANUAL programs, use the last completed values if available
			else {
				const lastCompleted = lastCompletedMap.get(exercise.exercise_id);
				if (lastCompleted) {
					sets = lastCompleted.sets;
					reps = lastCompleted.reps;
					weight = new Prisma.Decimal(lastCompleted.weight);
					weightValue = Number(lastCompleted.weight);
					source = "completed";
				} else {
					weightValue = Number(weight);
				}
			}

			return {
				workout_id: exercise.workout_id,
				exercise_id: exercise.exercise_id,
				sets,
				reps,
				weight: weightValue,
				order: exercise.order,
				exercises: {
					...exercise.exercises
				},
				equipment_type: exercise.exercises.equipment,
				is_compound: exercise.exercises.category === "COMPOUND",
				superset_with: supersetMap[exercise.exercise_id] || null,
				source,
			};
		});
	}
};