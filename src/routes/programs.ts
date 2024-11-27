import { Router } from "express";
import type { Request } from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
dotenv.config();

const router = Router();
const prisma = new PrismaClient();

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
		const { programName, userId, workouts } = req.body;

		// Validate input
		if (!programName || !userId || !workouts || !workouts.length) {
			return res.status(400).json({
				error: "Program name, user ID, and at least one workout are required",
			});
		}

		try {
			// Use a transaction to ensure all operations succeed or none do
			const result = await prisma.$transaction(async (prisma) => {
				// Create the program
				const program = await prisma.programs.create({
					data: {
						name: programName,
						userId: Number.parseInt(userId),
					},
				});

				// Create all workouts for this program
				const createdWorkouts = await Promise.all(
					workouts.map((workout: { name: string; program_id: number }) =>
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

export default router;
