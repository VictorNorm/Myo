import { type Prisma, type ProgramStatus } from "@prisma/client";
import prisma, { withRetry } from "../db";

// Program interfaces
export interface ProgramWithCounts {
	id: number;
	name: string;
	userId: number | null;
	status: ProgramStatus;
	goal: string;
	programType: string;
	startDate: Date;
	endDate: Date | null;
}

export interface ProgramsWithData {
	programs: ProgramWithCounts[];
	statusCounts: any[]; // Use any for now to match Prisma's groupBy return type
	activeProgram: ProgramWithCounts | undefined;
}

export interface WorkoutProgress {
	id: number;
	workout_id: number;
	program_id: number;
	user_id: number;
	completed_at: Date;
	next_scheduled_at: Date | null;
	created_at: Date;
	updated_at: Date;
}

export interface NextWorkoutResult {
	nextWorkout: any; // Full workout object to match old format
	isNewCycle: boolean;
	workout_progress: any[]; // Empty array to match old format
}

export interface CreateProgramInput {
	name: string;
	userId: number;
	goal: "HYPERTROPHY" | "STRENGTH";
	programType: "MANUAL" | "AUTOMATED";
	startDate: Date;
	endDate?: Date | null;
}

export interface CreateProgramWithWorkoutsInput extends CreateProgramInput {
	workouts: Array<{
		name: string;
	}>;
	shouldActivate?: boolean;
}

export interface CreateProgramWithWorkoutsAndExercisesInput {
	name: string;
	userId: number;
	goal: "HYPERTROPHY" | "STRENGTH";
	programType: "MANUAL" | "AUTOMATED";
	startDate: Date;
	endDate: Date | null;
	workouts: Array<{
		name: string;
		exercises?: Array<{
			exerciseId: number;
			sets: number;
			reps: number;
			weight: number;
			order?: number;
		}>;
	}>;
	baselines?: Array<{
		exerciseId: number;
		sets: number;
		reps: number;
		weight: number;
	}>;
	shouldActivate: boolean;
}

export interface UpdateProgramStatusInput {
	status: ProgramStatus;
	endDate?: Date | null;
}

type ProgramWhereInput = Prisma.programsWhereInput;

export const programRepository = {
	// Core CRUD operations
	async findById(id: number): Promise<ProgramWithCounts | null> {
		return prisma.programs.findUnique({
			where: { id },
			select: {
				id: true,
				name: true,
				userId: true,
				status: true,
				goal: true,
				programType: true,
				startDate: true,
				endDate: true,
			},
		});
	},

	async findByUserId(
		userId: number, 
		status?: ProgramStatus
	): Promise<ProgramsWithData> {
		const whereClause: ProgramWhereInput = { userId };
		if (status) {
			whereClause.status = status;
		}

		return withRetry(async () => {
			const [programs, statusCounts] = await prisma.$transaction([
				// Get programs
				prisma.programs.findMany({
					where: whereClause,
					orderBy: {
						startDate: "desc",
					},
					select: {
						id: true,
						name: true,
						userId: true,
						status: true,
						goal: true,
						programType: true,
						startDate: true,
						endDate: true,
					},
				}),

				// Get status counts
				prisma.programs.groupBy({
					by: ["status"],
					where: { userId },
					_count: true,
					orderBy: {
						status: "asc",
					},
				}),
			]);

			// Find active program
			const activeProgram =
				status === "ACTIVE"
					? programs[0]
					: programs.find((p) => p.status === "ACTIVE");

			return {
				programs,
				statusCounts,
				activeProgram,
			};
		});
	},

	async findByUserIdSimple(
		userId: number, 
		status?: ProgramStatus
	): Promise<ProgramWithCounts[]> {
		const whereClause: ProgramWhereInput = { userId };
		if (status) {
			whereClause.status = status;
		}

		return prisma.programs.findMany({
			where: whereClause,
			orderBy: {
				startDate: "desc",
			},
			select: {
				id: true,
				name: true,
				userId: true,
				status: true,
				goal: true,
				programType: true,
				startDate: true,
				endDate: true,
			},
		});
	},

	async findAll(): Promise<ProgramWithCounts[]> {
		return prisma.programs.findMany({
			orderBy: {
				startDate: "desc",
			},
			select: {
				id: true,
				name: true,
				userId: true,
				status: true,
				goal: true,
				programType: true,
				startDate: true,
				endDate: true,
			},
		});
	},

	async create(data: CreateProgramInput): Promise<ProgramWithCounts> {
		const created = await prisma.programs.create({
			data: {
				name: data.name,
				userId: data.userId,
				goal: data.goal,
				programType: data.programType,
				startDate: data.startDate,
				endDate: data.endDate,
			},
		});

		return {
			id: created.id,
			name: created.name,
			userId: created.userId,
			status: created.status,
			goal: created.goal,
			programType: created.programType,
			startDate: created.startDate,
			endDate: created.endDate,
		};
	},

	async createWithWorkouts(data: CreateProgramWithWorkoutsInput): Promise<ProgramWithCounts> {
		return prisma.$transaction(async (tx) => {
			// Create the program
			const program = await tx.programs.create({
				data: {
					name: data.name,
					userId: data.userId,
					goal: data.goal,
					programType: data.programType,
					startDate: data.startDate,
					endDate: data.endDate,
					status: data.shouldActivate ? "ACTIVE" : "PENDING",
				},
			});

			// If activating, set other programs to PENDING
			if (data.shouldActivate) {
				await tx.programs.updateMany({
					where: {
						userId: data.userId,
						id: { not: program.id },
					},
					data: {
						status: "PENDING",
					},
				});
			}

			// Create workouts
			const workoutsData = data.workouts.map((workout) => ({
				name: workout.name,
				program_id: program.id,
			}));

			await tx.workouts.createMany({
				data: workoutsData,
			});

			return {
				id: program.id,
				name: program.name,
				userId: program.userId,
				status: program.status,
				goal: program.goal,
				programType: program.programType,
				startDate: program.startDate,
				endDate: program.endDate,
			};
		});
	},

	async createWithWorkoutsAndExercises(
		data: CreateProgramWithWorkoutsAndExercisesInput
	): Promise<ProgramWithCounts> {
		return prisma.$transaction(async (tx) => {
			// 1. Create the program
			const program = await tx.programs.create({
				data: {
					name: data.name,
					userId: data.userId,
					goal: data.goal,
					programType: data.programType,
					startDate: data.startDate,
					endDate: data.endDate,
					status: data.shouldActivate ? "ACTIVE" : "PENDING",
				},
			});

			// 2. If activating, set all other user programs to PENDING
			if (data.shouldActivate) {
				await tx.programs.updateMany({
					where: {
						userId: data.userId,
						id: { not: program.id },
					},
					data: {
						status: "PENDING",
					},
				});
			}

			// 3. Create workouts and their exercises
			for (let i = 0; i < data.workouts.length; i++) {
				const workoutData = data.workouts[i];
				
				// Create the workout
				const workout = await tx.workouts.create({
					data: {
						name: workoutData.name,
						program_id: program.id,
					},
				});

				// 4. Create exercises for this workout (if provided)
				if (workoutData.exercises && workoutData.exercises.length > 0) {
					const exerciseData = workoutData.exercises.map((ex, index) => ({
						workout_id: workout.id,
						exercise_id: ex.exerciseId,
						sets: ex.sets,
						reps: ex.reps,
						weight: ex.weight,
						order: ex.order ?? index + 1, // Use provided order or default to index + 1
					}));

					await tx.workout_exercises.createMany({
						data: exerciseData,
					});
				}
			}

			// 5. Create baselines if provided (for AUTOMATED programs)
			if (data.baselines && data.baselines.length > 0) {
				const baselineData = data.baselines.map(b => ({
					exercise_id: b.exerciseId,
					user_id: data.userId,
					program_id: program.id,
					sets: b.sets,
					reps: b.reps,
					weight: b.weight,
				}));

				await tx.exercise_baselines.createMany({
					data: baselineData,
				});
			}

			// 6. Return the created program
			return {
				id: program.id,
				name: program.name,
				userId: program.userId,
				status: program.status,
				goal: program.goal,
				programType: program.programType,
				startDate: program.startDate,
				endDate: program.endDate,
			};
		});
	},

	async updateStatus(
		programId: number, 
		data: UpdateProgramStatusInput,
		userId: number
	): Promise<ProgramWithCounts> {
		return prisma.$transaction(async (tx) => {
			// If setting to ACTIVE, set all other user programs to PENDING
			if (data.status === "ACTIVE") {
				await tx.programs.updateMany({
					where: {
						userId,
						id: { not: programId },
					},
					data: {
						status: "PENDING",
					},
				});
			}

			const updated = await tx.programs.update({
				where: { id: programId },
				data: {
					status: data.status,
					endDate: data.endDate,
				},
			});

			return {
				id: updated.id,
				name: updated.name,
				userId: updated.userId,
				status: updated.status,
				goal: updated.goal,
				programType: updated.programType,
				startDate: updated.startDate,
				endDate: updated.endDate,
			};
		});
	},

	// Workout progress operations
	async findCompletedWorkoutsByProgram(
		programId: number, 
		userId: number
	): Promise<WorkoutProgress[]> {
		return prisma.workout_progress.findMany({
			where: {
				program_id: programId,
				user_id: userId,
			},
			orderBy: {
				completed_at: "desc",
			},
		});
	},

	async findNextWorkout(
		programId: number, 
		userId: number
	): Promise<NextWorkoutResult> {
		// Get all workouts for the program (full workout data)
		const allWorkouts = await prisma.workouts.findMany({
			where: { program_id: programId },
			orderBy: { id: "asc" },
		});

		if (allWorkouts.length === 0) {
			return {
				nextWorkout: null,
				isNewCycle: false,
				workout_progress: [],
			};
		}

		// Get completed workouts for this program
		const completedWorkouts = await this.findCompletedWorkoutsByProgram(programId, userId);

		if (completedWorkouts.length === 0) {
			// No workouts completed, return first workout
			return {
				nextWorkout: allWorkouts[0],
				isNewCycle: false,
				workout_progress: [],
			};
		}

		// Get the most recently completed workout
		const lastCompletedWorkout = completedWorkouts[0];
		const lastCompletedWorkoutData = allWorkouts.find(
			(w) => w.id === lastCompletedWorkout.workout_id
		);

		if (!lastCompletedWorkoutData) {
			return {
				nextWorkout: allWorkouts[0],
				isNewCycle: false,
				workout_progress: [],
			};
		}

		// Find the next workout in sequence
		const currentIndex = allWorkouts.findIndex(
			(w) => w.id === lastCompletedWorkoutData.id
		);
		
		const nextIndex = currentIndex + 1;

		if (nextIndex >= allWorkouts.length) {
			// Completed all workouts, start new cycle
			return {
				nextWorkout: allWorkouts[0],
				isNewCycle: true,
				workout_progress: [],
			};
		}

		return {
			nextWorkout: allWorkouts[nextIndex],
			isNewCycle: false,
			workout_progress: [],
		};
	},

	// Cascading deletion
	async cascadeDelete(programId: number): Promise<void> {
		await prisma.$transaction(async (tx) => {
			// Delete in specific order to maintain referential integrity

			// 1. Delete supersets first (references workout_exercises)
			await tx.supersets.deleteMany({
				where: {
					workout: {
						program_id: programId,
					},
				},
			});

			// 2. Delete completed exercises (references workouts)
			await tx.completed_exercises.deleteMany({
				where: {
					workout: {
						program_id: programId,
					},
				},
			});

			// 3. Delete workout exercises
			await tx.workout_exercises.deleteMany({
				where: {
					workouts: {
						program_id: programId,
					},
				},
			});

			// 4. Delete sessions (references workouts)
			await tx.sessions.deleteMany({
				where: {
					workouts: {
						program_id: programId,
					},
				},
			});

			// 5. Delete workout progress
			await tx.workout_progress.deleteMany({
				where: {
					program_id: programId,
				},
			});

			// 6. Delete progression history
			await tx.progression_history.deleteMany({
				where: {
					program_id: programId,
				},
			});

			// 7. Delete exercise baselines
			await tx.exercise_baselines.deleteMany({
				where: {
					program_id: programId,
				},
			});

			// 8. Delete workouts
			await tx.workouts.deleteMany({
				where: {
					program_id: programId,
				},
			});

			// 9. Finally delete the program
			await tx.programs.delete({
				where: {
					id: programId,
				},
			});
		});
	},

	async verifyOwnership(programId: number, userId: number): Promise<boolean> {
		const program = await prisma.programs.findFirst({
			where: {
				id: programId,
				userId: userId,
			},
		});
		
		return program !== null;
	},

	async verifyArchived(programId: number): Promise<boolean> {
		const program = await prisma.programs.findUnique({
			where: { id: programId },
			select: { status: true },
		});
		
		return program?.status === "ARCHIVED";
	},
};