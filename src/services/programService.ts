import { type ProgramStatus } from "@prisma/client";
import {
	programRepository,
	type ProgramWithCounts,
	type ProgramsWithData,
	type NextWorkoutResult,
	type CreateProgramInput,
	type CreateProgramWithWorkoutsInput,
	type CreateProgramWithWorkoutsAndExercisesInput,
	type UpdateProgramStatusInput,
} from "./repositories/programRepository";
import logger from "./logger";

// Status transition management
const VALID_STATUS_TRANSITIONS: Record<ProgramStatus, ProgramStatus[]> = {
	PENDING: ["ACTIVE", "ARCHIVED"] as ProgramStatus[],
	ACTIVE: ["COMPLETED", "ARCHIVED"] as ProgramStatus[],
	COMPLETED: ["ARCHIVED"] as ProgramStatus[],
	ARCHIVED: [] as ProgramStatus[],
};

// Business logic interfaces
export interface CreateProgramRequest {
	name: string;
	userId: number;
	goal: "HYPERTROPHY" | "STRENGTH";
	programType: "MANUAL" | "AUTOMATED";
	startDate: string;
	endDate?: string | null;
}

export interface CreateProgramWithWorkoutsRequest extends CreateProgramRequest {
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
	shouldActivate?: boolean;
	targetUserId?: number; // For admin creation
}

export interface UpdateProgramStatusRequest {
	status: ProgramStatus;
	endDate?: string | null;
}

export const programService = {
	// Status transition validation
	validateStatusTransition(
		currentStatus: ProgramStatus,
		newStatus: ProgramStatus
	): boolean {
		const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
		return validTransitions.includes(newStatus);
	},

	// Get programs for user with status filtering and counts
	async getUserPrograms(
		userId: number, 
		status?: ProgramStatus
	): Promise<ProgramsWithData> {
		try {
			const result = await programRepository.findByUserId(userId, status);

			logger.debug("Fetched programs for user", {
				userId,
				statusFilter: status,
				programCount: result.programs.length,
			});

			return result;
		} catch (error) {
			logger.error(
				`Error fetching programs for user ${userId}: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					userId,
					statusFilter: status,
				}
			);
			throw error;
		}
	},

	// Get programs for specific user (simple version for admin access)
	async getUserProgramsSimple(
		userId: number, 
		status?: ProgramStatus
	): Promise<ProgramWithCounts[]> {
		const result = await programRepository.findByUserIdSimple(userId, status);

		if (result.length === 0) {
			throw new Error(
				status
					? `No programs with status ${status} found for this user`
					: "No programs found for this user"
			);
		}

		logger.info("Fetched programs for user", {
			userId,
			statusFilter: status,
			programCount: result.length,
		});

		return result;
	},

	// Get all programs (admin endpoint)
	async getAllPrograms(): Promise<ProgramWithCounts[]> {
		return programRepository.findAll();
	},

	// Get next workout in program sequence
	async getNextWorkout(
		programId: number,
		userId: number
	): Promise<NextWorkoutResult> {
		// Verify user owns the program
		const hasAccess = await programRepository.verifyOwnership(programId, userId);
		if (!hasAccess) {
			throw new Error("Program not found or access denied");
		}

		const result = await programRepository.findNextWorkout(programId, userId);

		logger.debug("Retrieved next workout", {
			programId,
			userId,
			nextWorkout: result.nextWorkout?.name,
			isNewCycle: result.isNewCycle,
		});

		return result;
	},

	// Update program status with validation and business rules
	async updateProgramStatus(
		programId: number,
		userId: number,
		data: UpdateProgramStatusRequest
	): Promise<ProgramWithCounts> {
		// Verify user owns the program
		const hasAccess = await programRepository.verifyOwnership(programId, userId);
		if (!hasAccess) {
			throw new Error("Program not found or access denied");
		}

		// Get current program to validate transition
		const currentProgram = await programRepository.findById(programId);
		if (!currentProgram) {
			throw new Error("Program not found");
		}

		// Validate status transition
		if (!this.validateStatusTransition(currentProgram.status, data.status)) {
			throw new Error(
				`Invalid status transition from ${currentProgram.status} to ${data.status}`
			);
		}

		// Convert string date to Date if provided
		const updateData: UpdateProgramStatusInput = {
			status: data.status,
			endDate: data.endDate ? new Date(data.endDate) : undefined,
		};

		const updatedProgram = await programRepository.updateStatus(
			programId,
			updateData,
			userId
		);

		logger.info("Updated program status", {
			programId,
			userId,
			oldStatus: currentProgram.status,
			newStatus: data.status,
			endDate: data.endDate,
		});

		return updatedProgram;
	},

	// Create basic program
	async createProgram(data: CreateProgramRequest): Promise<ProgramWithCounts> {
		const createData: CreateProgramInput = {
			name: data.name,
			userId: data.userId,
			goal: data.goal,
			programType: data.programType,
			startDate: new Date(data.startDate),
			endDate: data.endDate ? new Date(data.endDate) : null,
		};

		const program = await programRepository.create(createData);

		logger.info("Created basic program", {
			programId: program.id,
			userId: data.userId,
			programName: data.name,
			programType: data.programType,
		});

		return program;
	},

	// Create program with workouts (complex creation)
	async createProgramWithWorkouts(
		requestingUserId: number,
		isAdmin: boolean,
		data: CreateProgramWithWorkoutsRequest
	): Promise<ProgramWithCounts> {
		// Determine target user - self or admin override
		const targetUserId = data.targetUserId || requestingUserId;

		// Validation: Only admins can create for other users
		if (targetUserId !== requestingUserId && !isAdmin) {
			throw new Error("Access denied: Cannot create programs for other users");
		}

		// Validation: Must have at least one workout
		if (!data.workouts || data.workouts.length === 0) {
			throw new Error("At least one workout is required");
		}

		// Validation: Workout names must be non-empty
		for (const workout of data.workouts) {
			if (!workout.name || workout.name.trim() === "") {
				throw new Error("All workouts must have a non-empty name");
			}
		}

		// NEW VALIDATION: AUTOMATED programs with exercises must have baselines
		if (data.programType === 'AUTOMATED') {
			const hasExercises = data.workouts.some(w => w.exercises && w.exercises.length > 0);
			if (hasExercises && (!data.baselines || data.baselines.length === 0)) {
				throw new Error("AUTOMATED programs with exercises require baselines");
			}
		}

		// NEW VALIDATION: Validate baseline exercises exist in workouts
		if (data.baselines && data.baselines.length > 0) {
			const allExerciseIds = new Set(
				data.workouts.flatMap(w => w.exercises?.map(e => e.exerciseId) || [])
			);
			
			for (const baseline of data.baselines) {
				if (!allExerciseIds.has(baseline.exerciseId)) {
					throw new Error(`Baseline references exercise ID ${baseline.exerciseId} which is not in any workout`);
				}
			}
		}

		const createData: CreateProgramWithWorkoutsAndExercisesInput = {
			name: data.name,
			userId: targetUserId,
			goal: data.goal,
			programType: data.programType,
			startDate: new Date(data.startDate),
			endDate: data.endDate ? new Date(data.endDate) : null,
			workouts: data.workouts,
			baselines: data.baselines,
			shouldActivate: data.shouldActivate || false,
		};

		const program = await programRepository.createWithWorkoutsAndExercises(createData);

		logger.info("Created program with workouts, exercises, and baselines", {
			programId: program.id,
			requestingUserId,
			targetUserId,
			programName: data.name,
			workoutCount: data.workouts.length,
			exerciseCount: data.workouts.reduce((sum, w) => sum + (w.exercises?.length || 0), 0),
			baselineCount: data.baselines?.length || 0,
			isAdminCreation: targetUserId !== requestingUserId,
		});

		return program;
	},

	// Delete program with cascade and validation
	async deleteProgram(
		programId: number,
		userId: number
	): Promise<void> {
		// Verify user owns the program
		const hasAccess = await programRepository.verifyOwnership(programId, userId);
		if (!hasAccess) {
			throw new Error("Program not found or access denied");
		}

		// Verify program is archived
		const isArchived = await programRepository.verifyArchived(programId);
		if (!isArchived) {
			throw new Error("Program must be archived before deletion");
		}

		await programRepository.cascadeDelete(programId);

		logger.info("Deleted program with cascade", {
			programId,
			userId,
		});
	},

	// Utility: Check if user owns program
	async verifyProgramOwnership(
		programId: number,
		userId: number
	): Promise<boolean> {
		return programRepository.verifyOwnership(programId, userId);
	},

	// Utility: Get program by ID for ownership verification
	async getProgramById(programId: number): Promise<ProgramWithCounts | null> {
		return programRepository.findById(programId);
	},
};