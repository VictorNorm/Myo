import { Router } from "express";
import type { Response, Request } from "express";
import { type Prisma, PrismaClient, type ProgramStatus } from "@prisma/client";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
import authorizeMiddleware from "../middleware/authorizeMiddleware";
dotenv.config();
import prisma from "../services/db";
import logger from "../services/logger";

const router = Router();

interface Workout {
	name: string;
	program_id?: number;
}

enum ProgramType {
	MANUAL = "MANUAL",
	AUTOMATED = "AUTOMATED",
}

enum Goal {
	HYPERTROPHY = "HYPERTROPHY",
	STRENGTH = "STRENGTH",
}

interface ExtendedWorkout {
	id: number;
	name: string;
	// exercises: any[]; // UPDATE WHEN STRUCTURE IS CLEAR
}

const VALID_STATUS_TRANSITIONS: Record<ProgramStatus, ProgramStatus[]> = {
	PENDING: ["ACTIVE", "ARCHIVED"] as ProgramStatus[],
	ACTIVE: ["COMPLETED", "ARCHIVED"] as ProgramStatus[],
	COMPLETED: ["ARCHIVED"] as ProgramStatus[],
	ARCHIVED: [] as ProgramStatus[],
};

// Helper function to validate status transitions
const isValidStatusTransition = (
	currentStatus: ProgramStatus,
	newStatus: ProgramStatus,
): boolean => {
	const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
	return validTransitions.includes(newStatus);
};

type ProgramWhereInput = Prisma.programsWhereInput;

interface Program {
	id?: number;
	name: string;
	userId: number;
	goal: Goal;
	programType: ProgramType;
	startDate: string;
	endDate?: string | null;
	workouts: Workout[];
}

router.get("/programs", authenticateToken, async (req: Request, res) => {
	if (!req.user) {
		logger.warn("Attempted to fetch programs with no user in request");
		return res.status(404).json({ message: "User not found" });
	}

	const userId = req.user.id;
	const { status } = req.query;

	// Set a reasonable timeout for the query (10 seconds)
	const queryTimeout = setTimeout(() => {
		logger.warn("Program fetch query timeout", { userId, statusFilter: status });
	}, 10000);

	try {
		// Create the where clause
		const whereClause: ProgramWhereInput = { userId };
		if (status) {
			whereClause.status = status as ProgramStatus;
		}

		// Use prisma.$transaction to ensure atomic queries and better timeout handling
		const [programs, statusCounts] = await prisma.$transaction([
			// Get programs
			prisma.programs.findMany({
				where: whereClause,
				orderBy: {
					startDate: "desc",
				},
				// Limit fields to what's necessary
				select: {
					id: true,
					name: true,
					userId: true,
					status: true,
					goal: true,
					programType: true,
					startDate: true,
					endDate: true,
					createdAt: true,
					updatedAt: true,
				},
			}),

			// Get status counts in the same transaction
			prisma.programs.groupBy({
				by: ["status"],
				where: { userId },
				_count: {
					status: true,
				},
			}),
		]);

		clearTimeout(queryTimeout);

		// Find active program without an additional query
		const activeProgram = status === "ACTIVE" 
			? programs[0] // If already filtered for ACTIVE, use first result
			: programs.find((p) => p.status === "ACTIVE");

		logger.debug("Fetched programs for user", {
			userId,
			statusFilter: status,
			programCount: programs.length,
		});

		return res.status(200).json({
			programs,
			statusCounts,
			activeProgram,
		});
	} catch (error) {
		clearTimeout(queryTimeout);
		logger.error(
			`Error fetching programs: ${error instanceof Error ? error.message : "Unknown error"}`,
			{
				stack: error instanceof Error ? error.stack : undefined,
				userId,
				statusFilter: status,
			},
		);
		return res.status(500).json({ error: "Internal server error" });
	}
});

router.get(
	"/programs/:userId",
	authenticateToken,
	async (req: Request, res) => {
		const userId = req.params.userId;
		const { status } = req.query;

		if (!userId) {
			logger.warn("Missing userId parameter in request");
			return res.status(400).json({ error: "User ID is required" });
		}

		const parsedUserId = Number.parseInt(userId);

		if (Number.isNaN(parsedUserId)) {
			logger.warn("Invalid userId format", { userId });
			return res.status(400).json({ error: "Invalid user ID format" });
		}

		try {
			const whereClause: ProgramWhereInput = { userId: parsedUserId };

			if (status) {
				whereClause.status = status as ProgramStatus;
			}

			const userPrograms = await prisma.programs.findMany({
				where: whereClause,
				orderBy: {
					startDate: "desc",
				},
			});

			if (userPrograms.length === 0) {
				logger.info("No programs found for user", {
					userId: parsedUserId,
					statusFilter: status,
				});
				return res.status(404).json({
					message: status
						? `No programs with status ${status} found for this user`
						: "No programs found for this user",
				});
			}

			const statusCounts = await prisma.programs.groupBy({
				by: ["status"],
				where: { userId: parsedUserId },
				_count: {
					status: true,
				},
			});

			logger.debug("Fetched programs for specific user", {
				userId: parsedUserId,
				statusFilter: status,
				programCount: userPrograms.length,
			});

			res.status(200).json({
				userPrograms,
				statusCounts,
				activeProgram: userPrograms.find((p) => p.status === "ACTIVE"),
			});
		} catch (error) {
			logger.error(
				`Error fetching user programs: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					userId: parsedUserId,
					statusFilter: status,
				},
			);
			res.status(500).json({ error: "Internal server error" });
		}
	},
);

router.get(
	"/programs/:programId/nextWorkout",
	authenticateToken,
	async (req, res) => {
		const { programId } = req.params;
		const userId = req.user?.id;

		try {
			const allWorkouts = await prisma.workouts.findMany({
				where: {
					program_id: Number(programId),
				},
				orderBy: {
					id: "asc",
				},
			});

			if (allWorkouts.length === 0) {
				logger.info("No workouts found for program", {
					programId: Number(programId),
				});
				return res
					.status(404)
					.json({ error: "No workouts found for this program" });
			}

			const completedWorkouts = await prisma.workout_progress.findMany({
				where: {
					program_id: Number(programId),
					user_id: Number(userId),
				},
				orderBy: {
					completed_at: "desc",
				},
				include: {
					workout: true,
				},
			});

			// If no workouts completed, return first workout
			if (completedWorkouts.length === 0) {
				logger.debug(
					"First workout in program returned (no completed workouts)",
					{
						programId: Number(programId),
						userId,
						workoutId: allWorkouts[0].id,
					},
				);
				return res.json({
					...allWorkouts[0],
					workout_progress: [],
					isNewCycle: false,
				});
			}

			// Get the most recently completed workout
			const latestCompleted = completedWorkouts[0];

			// Find its position in the workout sequence
			const currentIndex = allWorkouts.findIndex(
				(w) => w.id === latestCompleted.workout_id,
			);

			// If we're not at the end of the sequence, return next workout
			if (currentIndex < allWorkouts.length - 1) {
				logger.debug("Next workout in sequence returned", {
					programId: Number(programId),
					userId,
					lastCompletedWorkoutId: latestCompleted.workout_id,
					nextWorkoutId: allWorkouts[currentIndex + 1].id,
				});
				return res.json({
					...allWorkouts[currentIndex + 1],
					workout_progress: [],
					isNewCycle: false,
				});
			}

			// If we are at the end, return first workout with new cycle flag
			logger.debug(
				"First workout returned with new cycle flag (completed all workouts)",
				{
					programId: Number(programId),
					userId,
					lastCompletedWorkoutId: latestCompleted.workout_id,
					nextWorkoutId: allWorkouts[0].id,
				},
			);
			return res.json({
				...allWorkouts[0],
				workout_progress: [],
				isNewCycle: true,
			});
		} catch (error) {
			logger.error(
				`Error determining next workout: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId: Number(programId),
					userId,
				},
			);
			res.status(500).json({ error: "Internal server error" });
		}
	},
);

router.patch(
	"/programs/:programId/status",
	authenticateToken,
	authorizeMiddleware.programAccess,
	async (req: Request, res: Response) => {
		const { programId } = req.params;
		const { status: newStatus } = req.body;
		const userId = req.user?.id;

		if (!userId) {
			logger.warn(
				"Attempted to update program status without authenticated user",
			);
			return res.status(401).json({ error: "User not authenticated" });
		}

		if (!newStatus) {
			logger.warn("Missing status in program status update request", {
				programId: Number(programId),
			});
			return res.status(400).json({ error: "Status is required" });
		}

		try {
			const program = await prisma.programs.findUnique({
				where: { id: Number(programId) },
			});

			if (!program) {
				logger.warn("Attempted to update non-existent program", {
					programId: Number(programId),
				});
				return res.status(404).json({ error: "Program not found" });
			}

			if (program.userId !== userId) {
				logger.warn("Unauthorized program status update attempt", {
					programId: Number(programId),
					programOwnerId: program.userId,
					requestUserId: userId,
				});
				return res
					.status(403)
					.json({ error: "Not authorized to modify this program" });
			}

			// Validate status transition
			if (
				!isValidStatusTransition(program.status, newStatus as ProgramStatus)
			) {
				logger.warn("Invalid program status transition attempted", {
					programId: Number(programId),
					currentStatus: program.status,
					attemptedStatus: newStatus,
					validTransitions: VALID_STATUS_TRANSITIONS[program.status],
				});
				return res.status(400).json({
					error: `Invalid status transition from ${program.status} to ${newStatus}`,
					validTransitions: VALID_STATUS_TRANSITIONS[program.status],
				});
			}

			// If setting to ACTIVE, ensure no other active programs
			if (newStatus === "ACTIVE") {
				await prisma.$transaction(async (tx) => {
					// First, set all active programs to PENDING
					await tx.programs.updateMany({
						where: {
							userId,
							status: "ACTIVE",
						},
						data: {
							status: "PENDING",
						},
					});

					// Then set the requested program to active
					await tx.programs.update({
						where: { id: Number(programId) },
						data: { status: newStatus as ProgramStatus },
					});
				});
				logger.info("Program activated, other active programs set to pending", {
					programId: Number(programId),
					userId,
				});
			} else {
				// For non-ACTIVE status changes, just update the program
				await prisma.programs.update({
					where: { id: Number(programId) },
					data: { status: newStatus as ProgramStatus },
				});
				logger.info("Program status updated", {
					programId: Number(programId),
					userId,
					oldStatus: program.status,
					newStatus,
				});
			}

			res.status(200).json({
				message: "Program status updated successfully",
				newStatus: newStatus,
			});
		} catch (error) {
			logger.error(
				`Error updating program status: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId: Number(programId),
					userId,
					newStatus,
				},
			);
			res.status(500).json({ error: "Failed to update program status" });
		}
	},
);

router.get("/allprograms", authenticateToken, async (req: Request, res) => {
	try {
		const programs = await prisma.programs.findMany();
		logger.debug("Fetched all programs", { count: programs.length });
		res.status(200).json({ programs });
	} catch (error) {
		logger.error(
			`Error fetching all programs: ${error instanceof Error ? error.message : "Unknown error"}`,
			{
				stack: error instanceof Error ? error.stack : undefined,
			},
		);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.post("/programs", authenticateToken, async (req: Request, res) => {
	const { programName, programRecipientId } = req.body;

	try {
		const program = await prisma.programs.create({
			data: {
				name: programName,
				userId: Number.parseInt(programRecipientId),
			},
		});

		logger.info("Created new program", {
			programId: program.id,
			programName,
			userId: Number.parseInt(programRecipientId),
		});

		res.status(200).json();
	} catch (error) {
		logger.error(
			`Error creating program: ${error instanceof Error ? error.message : "Unknown error"}`,
			{
				stack: error instanceof Error ? error.stack : undefined,
				programName,
				userId: programRecipientId,
			},
		);
		res.status(500).json({ error: "Failed to create program" });
	}
});

router.post(
	"/programs/create-with-workouts",
	authenticateToken,
	async (req, res) => {
		const {
			programName,
			userId,
			workouts,
			goal,
			programType,
			startDate,
			endDate,
			setActive = false, // New parameter, defaults to false
		} = req.body;

		// Validate input
		if (
			!programName ||
			!userId ||
			!workouts ||
			!workouts.length ||
			!startDate ||
			!goal ||
			!programType ||
			!Object.values(ProgramType).includes(programType)
		) {
			logger.warn(
				"Invalid program creation request - missing required fields",
				{
					hasName: !!programName,
					hasUserId: !!userId,
					hasWorkouts: !!workouts,
					workoutsLength: workouts?.length,
					hasStartDate: !!startDate,
					hasGoal: !!goal,
					hasProgramType: !!programType,
					validProgramType: programType
						? Object.values(ProgramType).includes(programType)
						: false,
				},
			);
			return res.status(400).json({
				error:
					"Program name, user ID, goal, program type, start date, and at least one workout are required",
			});
		}

		if (
			Number.parseInt(userId) !== req.user?.id &&
			req.user?.role !== "ADMIN"
		) {
			logger.warn("Unauthorized program creation attempt for another user", {
				requestUserId: req.user?.id,
				targetUserId: Number.parseInt(userId),
				userRole: req.user?.role,
			});
			return res
				.status(403)
				.json({ error: "Not authorized to create program for other users" });
		}

		try {
			const result = await prisma.$transaction(async (prisma) => {
				// If setActive is true, first set all active programs to PENDING
				if (setActive) {
					await prisma.programs.updateMany({
						where: {
							userId: Number.parseInt(userId),
							status: "ACTIVE",
						},
						data: {
							status: "PENDING",
						},
					});
					logger.debug(
						"Set all active programs to PENDING for new active program",
						{
							userId: Number.parseInt(userId),
						},
					);
				}

				// Create the program with new fields
				const program = await prisma.programs.create({
					data: {
						name: programName,
						userId: Number.parseInt(userId),
						goal: goal,
						programType: programType,
						startDate: new Date(startDate),
						endDate: endDate ? new Date(endDate) : null,
						status: setActive ? "ACTIVE" : "PENDING",
					},
				});

				// Create all workouts for this program
				const createdWorkouts = await Promise.all(
					workouts.map((workout: Workout) =>
						prisma.workouts.create({
							data: {
								name: workout.name,
								program_id: program.id,
							},
						}),
					),
				);

				return {
					program,
					workouts: createdWorkouts,
				};
			});

			logger.info("Created program with workouts", {
				programId: result.program.id,
				programName,
				userId: Number.parseInt(userId),
				workoutCount: result.workouts.length,
				goal,
				programType,
				status: setActive ? "ACTIVE" : "PENDING",
			});

			res.status(201).json({
				message: "Program and workouts created successfully",
				data: result,
			});
		} catch (error) {
			logger.error(
				`Error creating program with workouts: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programName,
					userId,
					workoutCount: workouts?.length,
					goal,
					programType,
				},
			);
			res.status(500).json({
				error: "An error occurred while creating the program and workouts",
			});
		}
	},
);

router.delete(
	"/programs/:programId",
	authenticateToken,
	async (req: Request, res: Response) => {
		try {
			const programId = Number.parseInt(req.params.programId);
			const userId = req.user?.id;

			if (!userId) {
				logger.warn("Attempted to delete program without authenticated user");
				return res.status(401).json({ error: "User not authenticated" });
			}

			// Check if program exists and belongs to user
			const program = await prisma.programs.findUnique({
				where: { id: programId },
			});

			if (!program) {
				logger.warn("Attempted to delete non-existent program", { programId });
				return res.status(404).json({ error: "Program not found" });
			}

			if (program.userId !== userId) {
				logger.warn("Unauthorized program deletion attempt", {
					programId,
					programOwnerId: program.userId,
					requestUserId: userId,
				});
				return res
					.status(403)
					.json({ error: "Not authorized to delete this program" });
			}

			// Optional: Prevent deletion of active programs
			if (program.status !== "ARCHIVED") {
				logger.warn("Attempted to delete non-archived program", {
					programId,
					currentStatus: program.status,
				});
				return res.status(400).json({
					error: "Programs must be archived before deletion.",
					programId,
					currentStatus: program.status,
				});
			}

			await prisma.$transaction(async (tx) => {
				// First, get all workouts for this program
				const workouts = await tx.workouts.findMany({
					where: { program_id: programId },
					select: { id: true },
				});

				const workoutIds = workouts.map((w) => w.id);
				logger.debug("Deleting program and related data", {
					programId,
					workoutCount: workoutIds.length,
				});

				// Delete all supersets for these workouts
				await tx.supersets.deleteMany({
					where: { workout_id: { in: workoutIds } },
				});

				// Delete all workout exercises
				await tx.workout_exercises.deleteMany({
					where: { workout_id: { in: workoutIds } },
				});

				// Delete all completed exercises
				await tx.completed_exercises.deleteMany({
					where: { workout_id: { in: workoutIds } },
				});

				// Delete all sessions
				await tx.sessions.deleteMany({
					where: { workout_id: { in: workoutIds } },
				});

				// Delete workout progress
				await tx.workout_progress.deleteMany({
					where: { program_id: programId },
				});

				// Delete progression history
				await tx.progression_history.deleteMany({
					where: { program_id: programId },
				});

				// Delete exercise baselines
				await tx.exercise_baselines.deleteMany({
					where: { program_id: programId },
				});

				// Delete all workouts
				await tx.workouts.deleteMany({
					where: { program_id: programId },
				});

				// Delete program progression settings
				await tx.program_progression_settings.deleteMany({
					where: { program_id: programId },
				});

				// Finally, delete the program itself
				await tx.programs.delete({
					where: { id: programId },
				});
			});

			logger.info("Program deleted successfully", {
				programId,
				userId,
			});

			res.status(200).json({
				message: "Program deleted successfully",
				programId,
			});
		} catch (error) {
			logger.error(
				`Error deleting program: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId: Number.parseInt(req.params.programId),
					userId: req.user?.id,
				},
			);
			res.status(500).json({ error: "Failed to delete program" });
		}
	},
);

export default router;
