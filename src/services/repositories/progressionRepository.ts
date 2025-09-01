import prisma from "../db";
import type { Decimal } from "@prisma/client/runtime/library";

// Exercise baseline interface
export interface ExerciseBaseline {
	exercise_id: number;
	user_id: number;
	program_id: number;
	sets: number;
	reps: number;
	weight: Decimal;
}

// Progression history interface
export interface ProgressionHistory {
	id: number;
	exercise_id: number;
	user_id: number;
	program_id: number;
	oldWeight: Decimal;
	newWeight: Decimal;
	oldReps: number;
	newReps: number;
	reason: string;
	createdAt: Date;
}

// Current template interface
export interface CurrentTemplate {
	sets: number | null;
	reps: number | null;
	weight: Decimal | null;
}

// Last completed exercise interface
export interface LastCompleted {
	sets: number;
	reps: number;
	weight: Decimal;
	rating: number | null;
	completedAt: Date;
}

// Workout with exercises interface for progression
export interface ProgressionWorkoutWithExercises {
	id: number;
	program_id: number | null;
	workout_exercises: {
		exercise_id: number;
		sets: number | null;
		reps: number | null;
		weight: Decimal | null;
		exercises: {
			name: string;
		};
	}[];
}

export const progressionRepository = {
	// Get workout by ID with basic info
	findWorkoutById: async (workoutId: number) => {
		return await prisma.workouts.findUnique({
			where: { id: workoutId },
			select: { program_id: true },
		});
	},

	// Get workout by ID with exercises
	findWorkoutWithExercises: async (workoutId: number): Promise<ProgressionWorkoutWithExercises | null> => {
		return await prisma.workouts.findUnique({
			where: { id: workoutId },
			include: {
				workout_exercises: {
					include: {
						exercises: {
							select: {
								name: true,
							},
						},
					},
					orderBy: {
						order: 'asc',
					},
				},
			},
		});
	},

	// Get exercise baseline
	findExerciseBaseline: async (
		exerciseId: number,
		userId: number,
		programId: number
	): Promise<ExerciseBaseline | null> => {
		return await prisma.exercise_baselines.findUnique({
			where: {
				exercise_id_user_id_program_id: {
					exercise_id: exerciseId,
					user_id: userId,
					program_id: programId,
				},
			},
		});
	},

	// Get progression history for exercise
	findProgressionHistory: async (
		exerciseId: number,
		userId: number,
		programId: number,
		limit: number = 10
	): Promise<ProgressionHistory[]> => {
		return await prisma.progression_history.findMany({
			where: {
				exercise_id: exerciseId,
				user_id: userId,
				program_id: programId,
			},
			orderBy: {
				createdAt: "desc",
			},
			take: limit,
		});
	},

	// Get current template values for exercise in workout
	findCurrentTemplate: async (
		workoutId: number,
		exerciseId: number
	): Promise<CurrentTemplate | null> => {
		return await prisma.workout_exercises.findUnique({
			where: {
				workout_id_exercise_id: {
					workout_id: workoutId,
					exercise_id: exerciseId,
				},
			},
			select: {
				sets: true,
				reps: true,
				weight: true,
			},
		});
	},

	// Get last completed exercise for user in program
	findLastCompleted: async (
		exerciseId: number,
		userId: number,
		programId: number
	): Promise<LastCompleted | null> => {
		return await prisma.completed_exercises.findFirst({
			where: {
				exercise_id: exerciseId,
				user_id: userId,
				workout: {
					program_id: programId,
				},
			},
			orderBy: {
				completedAt: "desc",
			},
			select: {
				sets: true,
				reps: true,
				weight: true,
				rating: true,
				completedAt: true,
			},
		});
	},

	// Get multiple exercise baselines for workout
	findMultipleExerciseBaselines: async (
		exerciseIds: number[],
		userId: number,
		programId: number
	): Promise<ExerciseBaseline[]> => {
		return await prisma.exercise_baselines.findMany({
			where: {
				exercise_id: { in: exerciseIds },
				user_id: userId,
				program_id: programId,
			},
		});
	},

	// Get multiple last completed exercises
	findMultipleLastCompleted: async (
		exerciseIds: number[],
		userId: number,
		programId: number
	): Promise<(LastCompleted & { exerciseId: number })[]> => {
		const results = await Promise.all(
			exerciseIds.map(async (exerciseId) => {
				const lastCompleted = await prisma.completed_exercises.findFirst({
					where: {
						exercise_id: exerciseId,
						user_id: userId,
						workout: {
							program_id: programId,
						},
					},
					orderBy: {
						completedAt: "desc",
					},
					select: {
						sets: true,
						reps: true,
						weight: true,
						rating: true,
						completedAt: true,
					},
				});
				
				return lastCompleted ? { 
					exerciseId, 
					sets: lastCompleted.sets,
					reps: lastCompleted.reps,
					weight: lastCompleted.weight,
					rating: lastCompleted.rating,
					completedAt: lastCompleted.completedAt
				} : null;
			})
		);
		
		return results.filter((result): result is LastCompleted & { exerciseId: number } => result !== null);
	}
};