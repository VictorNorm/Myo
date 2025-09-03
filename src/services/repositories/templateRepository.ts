import prisma from "../db";
import type { Decimal } from "@prisma/client/runtime/library";

// Template-specific interfaces
export interface ExerciseBaselineFromDB {
	exercise_id: number;
	user_id: number;
	program_id: number;
	sets: number;
	reps: number;
	weight: Decimal;
	id: number;
	createdAt: Date;
	updatedAt?: Date;
}

export interface CompletedExerciseFromDB {
	exercise_id: number;
	sets: number;
	reps: number;
	weight: string;
}

export interface WorkoutWithProgram {
	id: number;
	program_id: number | null;
	programs: {
		id: number;
		name: string;
		programType: string;
		goal: string;
	} | null;
}

export interface WorkoutExerciseWithDetails {
	workout_id: number;
	exercise_id: number;
	sets: number | null;
	reps: number | null;
	weight: Decimal | null;
	order: number | null;
	exercises: {
		id: number;
		name: string;
		equipment: string | null;
		category: string | null;
		videoUrl: string | null;
	};
}

export interface SupersetData {
	first_exercise_id: number;
	second_exercise_id: number;
}

export const templateRepository = {
	// Get workout with program details
	async getWorkoutWithProgram(workoutId: number): Promise<WorkoutWithProgram | null> {
		return prisma.workouts.findUnique({
			where: { id: workoutId },
			include: {
				programs: {
					select: {
						id: true,
						name: true,
						programType: true,
						goal: true,
					},
				},
			},
		});
	},

	// Get workout exercises with details
	async getWorkoutExercisesWithDetails(workoutId: number): Promise<WorkoutExerciseWithDetails[]> {
		return prisma.workout_exercises.findMany({
			where: {
				workout_id: workoutId,
			},
			include: {
				exercises: {
					select: {
						id: true,
						name: true,
						equipment: true,
						category: true,
						videoUrl: true,
					},
				},
			},
			orderBy: {
				order: "asc",
			},
		});
	},

	// Get supersets for workout
	async getSupersets(workoutId: number): Promise<SupersetData[]> {
		return prisma.supersets.findMany({
			where: {
				workout_id: workoutId,
			},
		});
	},

	// Get exercise baselines for automated programs
	async getExerciseBaselines(
		userId: number, 
		programId: number, 
		exerciseIds: number[]
	): Promise<ExerciseBaselineFromDB[]> {
		return prisma.exercise_baselines.findMany({
			where: {
				user_id: userId,
				program_id: programId,
				exercise_id: {
					in: exerciseIds,
				},
			},
		});
	},

	// Get last completed exercises for manual programs
	async getLastCompletedExercises(
		userId: number, 
		workoutId: number
	): Promise<CompletedExerciseFromDB[]> {
		return prisma.$queryRaw`
			SELECT DISTINCT ON (exercise_id)
			  exercise_id,
			  sets,
			  reps,
			  weight
			FROM completed_exercises
			WHERE user_id = ${userId}
			AND workout_id = ${workoutId}
			ORDER BY exercise_id, "completedAt" DESC
		`;
	},
};