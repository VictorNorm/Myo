import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken from "../middleware/authenticateToken";
import jwt from "jsonwebtoken";

const router = Router();
const prisma = new PrismaClient();

const verifyToken = (token: string) => {
	try {
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		const decoded = jwt.verify(token.split(" ")[1], process.env.JWT_SECRET!);
		console.log("Manually decoded token:", decoded);
		return decoded;
	} catch (err) {
		console.error("Token verification error:", err);
		return null;
	}
};

router.get("/user-settings", authenticateToken, async (req, res) => {
	try {
		const authHeader = req.headers.authorization;
		if (authHeader) {
			const decoded = verifyToken(authHeader);
		}

		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		// Ensure userId is a number
		let parsedUserId: string | number;
		if (typeof userId === "string") {
			parsedUserId = Number.parseInt(userId, 10);
		} else if (typeof userId === "number") {
			parsedUserId = userId;
		} else {
			console.log("Unexpected userId type:", typeof userId);
			return res.status(400).json({ error: "Invalid user ID format" });
		}

		if (Number.isNaN(parsedUserId)) {
			console.log("Failed to parse userId to number");
			return res.status(400).json({ error: "Invalid user ID format" });
		}

		// First get the user's current program
		const currentProgram = await prisma.programs.findFirst({
			where: {
				userId: parsedUserId, // Use parsed ID
				endDate: null,
			},
			include: {
				progressionSettings: true,
			},
		});

		// Get the default dumbbell exercises to check their increments
		const dumbbellExercises = await prisma.exercises.findMany({
			where: {
				equipment: "DUMBBELL",
			},
		});

		res.json({
			experienceLevel:
				currentProgram?.progressionSettings?.experienceLevel || "BEGINNER",
			dumbbellIncrement: dumbbellExercises[0]?.defaultIncrementKg || 2.0,
			useMetric: true,
			darkMode: true,
		});
	} catch (error) {
		console.error("Settings error:", error); // Enhanced error logging
		res.status(500).json({ error: "Internal server error" });
	}
});

// Update user settings
router.patch("/user/settings", authenticateToken, async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		const parsedUserId =
			typeof userId === "string" ? Number.parseInt(userId, 10) : userId;
		console.log("Parsed User ID:", parsedUserId, "type:", typeof parsedUserId);

		const { experienceLevel, dumbbellIncrement, useMetric, darkMode } =
			req.body;

		// First get or create current program
		let currentProgram = await prisma.programs.findFirst({
			where: {
				userId: parsedUserId,
				endDate: null,
			},
		});

		if (!currentProgram) {
			// Create a default program if none exists
			currentProgram = await prisma.programs.create({
				data: {
					name: "Default Program",
					userId: userId,
					goal: "HYPERTROPHY",
					programType: "AUTOMATED",
				},
			});
		}

		// Update or create program progression settings
		if (experienceLevel) {
			await prisma.program_progression_settings.upsert({
				where: {
					program_id: currentProgram.id,
				},
				create: {
					program_id: currentProgram.id,
					experienceLevel: experienceLevel,
					weeklyFrequency: 3, // Default value
				},
				update: {
					experienceLevel: experienceLevel,
				},
			});
		}

		// Update dumbbell increments
		if (dumbbellIncrement) {
			await prisma.exercises.updateMany({
				where: {
					equipment: "DUMBBELL",
				},
				data: {
					defaultIncrementKg: dumbbellIncrement,
				},
			});
		}

		res.json({ message: "Settings updated successfully" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
