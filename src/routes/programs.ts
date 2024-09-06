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

	console.log(programName);
	console.log(programRecipientId);

	await prisma.programs.create({
		data: {
			name: programName,
			userId: Number.parseInt(programRecipientId),
		},
	});

	res.status(200).json();
});

export default router;
