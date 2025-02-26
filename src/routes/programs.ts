import { Router } from "express";
import type { Response, Request } from "express";
import { type Prisma, PrismaClient, type ProgramStatus } from "@prisma/client";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
import authorizeMiddleware from "../middleware/authorizeMiddleware";
dotenv.config();

const router = Router();
const prisma = new PrismaClient();

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
	if (req.user) {
		const userId = req.user.id;
		const { status } = req.query;

		const whereClause: ProgramWhereInput = { userId };

		if (status) {
			whereClause.status = status as ProgramStatus;
		}

		const programs = await prisma.programs.findMany({
			where: whereClause,
			orderBy: {
				startDate: "desc",
			},
		});

		const statusCounts = await prisma.programs.groupBy({
			by: ["status"],
			where: { userId },
			_count: {
				status: true,
			},
		});

		res.status(200).json({
			programs,
			statusCounts,
			activeProgram: programs.find((p) => p.status === "ACTIVE"),
		});
	} else {
		res.status(404).json({ message: "User not found" });
	}
});

router.get(
	"/programs/:userId",
	authenticateToken,
	async (req: Request, res) => {
		const userId = req.params.userId;
		const { status } = req.query;

		if (!userId) {
			return res.status(400).json({ error: "User ID is required" });
		}

		const parsedUserId = Number.parseInt(userId);

		if (Number.isNaN(parsedUserId)) {
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

			res.status(200).json({
				userPrograms,
				statusCounts,
				activeProgram: userPrograms.find((p) => p.status === "ACTIVE"),
			});
		} catch (error) {
			console.error("Error fetching user programs:", error);
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
				return res.json({
					...allWorkouts[0],
					workout_progress: [],
					isNewCycle: false,
				});
			}

			// Get the most recently completed workout
			const latestCompleted = completedWorkouts[0];
			console.log("Latest completed:", latestCompleted);

			// Find its position in the workout sequence
			const currentIndex = allWorkouts.findIndex(
				(w) => w.id === latestCompleted.workout_id,
			);

			// If we're not at the end of the sequence, return next workout
			if (currentIndex < allWorkouts.length - 1) {
				return res.json({
					...allWorkouts[currentIndex + 1],
					workout_progress: [],
					isNewCycle: false,
				});
			}

			// If we are at the end, return first workout with new cycle flag
			return res.json({
				...allWorkouts[0],
				workout_progress: [],
				isNewCycle: true,
			});
		} catch (error) {
			console.error("Error in nextWorkout:", error);
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
			return res.status(401).json({ error: "User not authenticated" });
		}

		if (!newStatus) {
			return res.status(400).json({ error: "Status is required" });
		}

		try {
			const program = await prisma.programs.findUnique({
				where: { id: Number(programId) },
			});

			if (!program) {
				return res.status(404).json({ error: "Program not found" });
			}

			if (program.userId !== userId) {
				return res
					.status(403)
					.json({ error: "Not authorized to modify this program" });
			}

			// Validate status transition
			if (
				!isValidStatusTransition(program.status, newStatus as ProgramStatus)
			) {
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
			} else {
				// For non-ACTIVE status changes, just update the program
				await prisma.programs.update({
					where: { id: Number(programId) },
					data: { status: newStatus as ProgramStatus },
				});
			}

			res.status(200).json({
				message: "Program status updated successfully",
				newStatus: newStatus,
			});
		} catch (error) {
			console.error("Error updating program status:", error);
			res.status(500).json({ error: "Failed to update program status" });
		}
	},
);

router.get("/allprograms", authenticateToken, async (req: Request, res) => {
	const programs = await prisma.programs.findMany();

	res.status(200).json({ programs });
});

router.post("/programs", authenticateToken, async (req: Request, res) => {
	const { programName, programRecipientId } = req.body;

	await prisma.programs.create({
		data: {
			name: programName,
			userId: Number.parseInt(programRecipientId),
		},
	});

	res.status(200).json();
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
			return res.status(400).json({
				error:
					"Program name, user ID, goal, program type, start date, and at least one workout are required",
			});
		}

		if (Number.parseInt(userId) !== req.user?.id) {
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

			res.status(201).json({
				message: "Program and workouts created successfully",
				data: result,
			});
		} catch (error) {
			console.error("Error creating program with workouts:", error);
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
				return res.status(401).json({ error: "User not authenticated" });
			}

			// Check if program exists and belongs to user
			const program = await prisma.programs.findUnique({
				where: { id: programId },
			});

			if (!program) {
				return res.status(404).json({ error: "Program not found" });
			}

			if (program.userId !== userId) {
				return res
					.status(403)
					.json({ error: "Not authorized to delete this program" });
			}

			// Optional: Prevent deletion of active programs
			if (program.status !== "ARCHIVED") {
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

			res.status(200).json({
				message: "Program deleted successfully",
				programId,
			});
		} catch (error) {
			console.error("Error deleting program:", error);
			res.status(500).json({ error: "Failed to delete program" });
		}
	},
);

export default router;
