import { Router } from "express";
import type { Response, Request } from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
dotenv.config();

const router = Router();
const prisma = new PrismaClient();

interface Workout {
	name: string;
	program_id?: number;
}

enum ProgramType {
	PT_MANAGED = "PT_MANAGED",
	AI_ASSISTED = "AI_ASSISTED",
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
		const programs = await prisma.programs.findMany({ where: { userId } });
		res.status(200).json({ programs });
	} else {
		res.status(404).json({ message: "User not found" });
	}
});

router.get(
	"/programs/:userId",
	authenticateToken,
	async (req: Request, res) => {
		const userId = req.params.userId;

		if (!userId) {
			return res.status(400).json({ error: "User ID is required" });
		}

		const parsedUserId = Number.parseInt(userId);

		if (Number.isNaN(parsedUserId)) {
			return res.status(400).json({ error: "Invalid user ID format" });
		}

		try {
			const userPrograms = await prisma.programs.findMany({
				where: { userId: parsedUserId },
			});

			if (userPrograms.length === 0) {
				return res
					.status(404)
					.json({ message: "No programs found for this user" });
			}

			res.status(200).json({ userPrograms });
		} catch (error) {
			console.error("Error fetching user programs:", error);
			res.status(500).json({ error: "Internal server error" });
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
			!Object.values(ProgramType).includes(programType) // Check if it's a valid enum value
		) {
			return res.status(400).json({
				error:
					"Program name, user ID, goal, program type, start date, and at least one workout are required",
			});
		}

		try {
			const result = await prisma.$transaction(async (prisma) => {
				// Create the program with new fields
				const program = await prisma.programs.create({
					data: {
						name: programName,
						userId: Number.parseInt(userId),
						goal: goal,
						programType: programType,
						startDate: new Date(startDate),
						endDate: endDate ? new Date(endDate) : null,
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

			res.status(200).json({ message: "Program deleted successfully" });
		} catch (error) {
			console.error("Error deleting program:", error);
			res.status(500).json({ error: "Failed to delete program" });
		}
	},
);

export default router;
