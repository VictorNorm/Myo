import { type Prisma } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";
import prisma from "../db";

// Stats interfaces
export interface ExerciseProgressionData {
	exerciseId: number;
	exerciseName: string;
	baseline: {
		sets: number;
		reps: number;
		weight: number;
	} | null;
	progressionHistory: {
		id: number;
		oldWeight: Decimal;
		newWeight: Decimal;
		oldReps: number;
		newReps: number;
		reason: string;
		createdAt: Date;
	}[];
	lastCompleted: {
		sets: number;
		reps: number;
		weight: string;
		rating: number | null;
		completedAt: Date;
	} | null;
}

export interface CompletedExerciseWithDetails {
	id: number;
	sets: number;
	reps: number;
	weight: Decimal;
	completedAt: Date;
	rating: number | null;
	exercise_id: number;
	user_id: number;
	workout_id: number;
	exercise: {
		id: number;
		name: string;
		muscle_groups: {
			muscle_groups: {
				id: number;
				name: string;
			};
		}[];
	};
}

export interface WorkoutProgressData {
	id: number;
	completed_at: Date;
	user_id: number;
	program_id: number;
	workout_id: number;
}

export type WorkoutCompletion = {
	id: number;
	workout_id: number;
	completed_at: Date;
};

export interface ProgramBasicInfo {
	id: number;
	name: string;
	startDate: Date;
	totalWorkouts: number;
	weeklyFrequency: number;
	status: string;
}

export interface ProgressionHistoryWithExercise {
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
	exercise: {
		id: number;
		name: string;
	};
}

export const statsRepository = {
	// Get program basic info
	async getProgramInfo(programId: number): Promise<ProgramBasicInfo | null> {
		return prisma.programs.findUnique({
			where: { id: programId },
			select: {
				id: true,
				name: true,
				startDate: true,
				totalWorkouts: true,
				status: true,
				weeklyFrequency: true,
			},
		});
	},

	// Get all exercise progression data for a program (optimized)
	async getExerciseProgressionData(
		programId: number,
		userId: number
	): Promise<ExerciseProgressionData[]> {
		// First, get all unique exercise IDs from workouts in this program
		const workoutsWithExercises = await prisma.workouts.findMany({
			where: { program_id: programId },
			include: {
				workout_exercises: {
					select: { exercise_id: true },
				},
			},
		});

		const exerciseIds = Array.from(
			new Set(
				workoutsWithExercises.flatMap((workout) =>
					workout.workout_exercises.map((we) => we.exercise_id)
				)
			)
		);

		if (exerciseIds.length === 0) {
			return [];
		}

		// Batch fetch all data needed for progression analysis
		const [exercises, baselines, progressionHistory, lastCompleted] = await Promise.all([
			// Get exercise details
			prisma.exercises.findMany({
				where: { id: { in: exerciseIds } },
				select: { id: true, name: true },
			}),

			// Get baselines for all exercises
			prisma.exercise_baselines.findMany({
				where: {
					user_id: userId,
					program_id: programId,
					exercise_id: { in: exerciseIds },
				},
			}),

			// Get progression history for all exercises
			prisma.progression_history.findMany({
				where: {
					user_id: userId,
					program_id: programId,
					exercise_id: { in: exerciseIds },
				},
				orderBy: { createdAt: "desc" },
			}),

			// Get last completed exercise for each
			prisma.$queryRaw<Array<{
				exercise_id: number;
				sets: number;
				reps: number;
				weight: string;
				rating: number | null;
				completedAt: Date;
			}>>`
				SELECT DISTINCT ON (exercise_id)
					exercise_id,
					sets,
					reps,
					weight,
					rating,
					"completedAt"
				FROM completed_exercises
				WHERE user_id = ${userId}
					AND exercise_id = ANY(${exerciseIds})
				ORDER BY exercise_id, "completedAt" DESC
			`,
		]);

		// Create lookup maps for efficiency
		const exerciseMap = new Map(exercises.map((e) => [e.id, e]));
		const baselineMap = new Map(baselines.map((b) => [b.exercise_id, b]));
		const lastCompletedMap = new Map(lastCompleted.map((lc) => [lc.exercise_id, lc]));

		// Group progression history by exercise
		const progressionMap = new Map<number, typeof progressionHistory>();
		for (const ph of progressionHistory) {
			if (!progressionMap.has(ph.exercise_id)) {
				progressionMap.set(ph.exercise_id, []);
			}
			progressionMap.get(ph.exercise_id)!.push(ph);
		}

		// Build result array
		return exerciseIds.map((exerciseId) => {
			const exercise = exerciseMap.get(exerciseId);
			const baseline = baselineMap.get(exerciseId);
			const progression = progressionMap.get(exerciseId) || [];
			const lastComp = lastCompletedMap.get(exerciseId);

			return {
				exerciseId,
				exerciseName: exercise?.name || `Exercise ${exerciseId}`,
				baseline: baseline
					? {
							sets: baseline.sets,
							reps: baseline.reps,
							weight: Number(baseline.weight),
					  }
					: null,
				progressionHistory: progression.map((p) => ({
					id: p.id,
					oldWeight: p.oldWeight,
					newWeight: p.newWeight,
					oldReps: p.oldReps,
					newReps: p.newReps,
					reason: p.reason,
					createdAt: p.createdAt,
				})),
				lastCompleted: lastComp
					? {
							sets: lastComp.sets,
							reps: lastComp.reps,
							weight: lastComp.weight,
							rating: lastComp.rating,
							completedAt: lastComp.completedAt,
					  }
					: null,
			};
		});
	},

	// Get completed exercises with muscle group details (optimized)
	async getCompletedExercisesWithDetails(
		programId: number,
		userId: number,
		dateFilter?: { startDate: Date; endDate: Date }
	): Promise<CompletedExerciseWithDetails[]> {
		const whereClause: Prisma.completed_exercisesWhereInput = {
			user_id: userId,
			workout: {
				program_id: programId,
			},
		};

		if (dateFilter) {
			whereClause.completedAt = {
				gte: dateFilter.startDate,
				lte: dateFilter.endDate,
			};
		}

		return prisma.completed_exercises.findMany({
			where: whereClause,
			include: {
				exercise: {
					select: {
						id: true,
						name: true,
						muscle_groups: {
							select: {
								muscle_groups: {
									select: {
										id: true,
										name: true,
									},
								},
							},
						},
					},
				},
			},
			orderBy: { completedAt: "asc" },
		});
	},

	// Get workout progress data with date filtering
	async getWorkoutProgressData(
		programId: number,
		userId: number,
		dateFilter?: { startDate: Date; endDate: Date }
	): Promise<WorkoutProgressData[]> {
		const whereClause: Prisma.workout_progressWhereInput = {
			user_id: userId,
			program_id: programId,
		};

		if (dateFilter) {
			whereClause.completed_at = {
				gte: dateFilter.startDate,
				lte: dateFilter.endDate,
			};
		}

		return prisma.workout_progress.findMany({
			where: whereClause,
			orderBy: { completed_at: "asc" },
		});
	},

	// Get workout completions for frequency tracking
	async getWorkoutCompletions(
		programId: number,
		userId: number,
		dateFilter?: { startDate: Date; endDate: Date }
	): Promise<WorkoutCompletion[]> {
		const whereClause: Prisma.workout_completionsWhereInput = {
			user_id: userId,
			program_id: programId,
		};

		if (dateFilter) {
			whereClause.completed_at = {
				gte: dateFilter.startDate,
				lte: dateFilter.endDate,
			};
		}

		return prisma.workout_completions.findMany({
			where: whereClause,
			select: {
				id: true,
				workout_id: true,
				completed_at: true,
			},
			orderBy: { completed_at: "asc" },
		});
	},

	// Get progression history with exercise details for statistics
	async getProgressionHistoryWithExercises(
		programId: number,
		userId: number
	): Promise<ProgressionHistoryWithExercise[]> {
		return prisma.progression_history.findMany({
			where: {
				user_id: userId,
				program_id: programId,
			},
			include: {
				exercise: {
					select: {
						id: true,
						name: true,
					},
				},
			},
			orderBy: { createdAt: "asc" },
		});
	},

	// Get completed exercises for volume calculations (optimized query)
	async getCompletedExercisesForVolume(
		programId: number,
		userId: number,
		dateFilter?: { startDate: Date; endDate: Date }
	): Promise<Array<{
		id: number;
		sets: number;
		reps: number;
		weight: Decimal;
		completedAt: Date;
		exercise_id: number;
		exercise: {
			name: string;
		};
	}>> {
		const whereClause: Prisma.completed_exercisesWhereInput = {
			user_id: userId,
			workout: {
				program_id: programId,
			},
		};

		if (dateFilter) {
			whereClause.completedAt = {
				gte: dateFilter.startDate,
				lte: dateFilter.endDate,
			};
		}

		return prisma.completed_exercises.findMany({
			where: whereClause,
			select: {
				id: true,
				sets: true,
				reps: true,
				weight: true,
				completedAt: true,
				exercise_id: true,
				exercise: {
					select: {
						name: true,
					},
				},
			},
			orderBy: { completedAt: "asc" },
		});
	},

	// Utility function to get date ranges based on program start
	getDateFilterForTimeFrame(
		programStartDate: Date,
		timeFrame: "week" | "month" | "program" | "all"
	): { startDate: Date; endDate: Date } | undefined {
		const now = new Date();
		const currentDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());

		switch (timeFrame) {
			case "week": {
				const startOfWeek = new Date(currentDate);
				startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
				return {
					startDate: startOfWeek,
					endDate: currentDate,
				};
			}
			case "month": {
				const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
				return {
					startDate: startOfMonth,
					endDate: currentDate,
				};
			}
			case "program":
				return {
					startDate: new Date(programStartDate.getFullYear(), programStartDate.getMonth(), programStartDate.getDate()),
					endDate: currentDate,
				};
			case "all":
				return undefined; // No date filter
			default:
				return undefined;
		}
	},
};