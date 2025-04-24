import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import authenticateToken from "../middleware/authenticateToken";
import jwt from "jsonwebtoken";
import prisma from "../services/db";
import logger from "../services/logger";

const router = Router();

router.get("/user-settings", authenticateToken, async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			logger.warn("Unauthorized attempt to access user settings");
			return res.status(401).json({ error: "Unauthorized" });
		}

		// Ensure userId is a number
		let parsedUserId: number;
		if (typeof userId === "string") {
			parsedUserId = Number.parseInt(userId, 10);
		} else if (typeof userId === "number") {
			parsedUserId = userId;
		} else {
			logger.warn("Invalid user ID format in settings request", { userId });
			return res.status(400).json({ error: "Invalid user ID format" });
		}

		if (Number.isNaN(parsedUserId)) {
			logger.warn("Invalid user ID format (NaN) in settings request", {
				userId,
			});
			return res.status(400).json({ error: "Invalid user ID format" });
		}

		// Get user settings or create default if not exists
		let userSettings = await prisma.user_settings.findUnique({
			where: {
				user_id: parsedUserId,
			},
		});

		if (!userSettings) {
			// Create default settings if they don't exist
			logger.info("Creating default settings for user", {
				userId: parsedUserId,
			});
			userSettings = await prisma.user_settings.create({
				data: {
					user_id: parsedUserId,
					experienceLevel: "BEGINNER",
					barbellIncrement: 2.5,
					dumbbellIncrement: 2.0,
					cableIncrement: 2.5,
					machineIncrement: 5.0,
					useMetric: true,
					darkMode: true,
				},
			});
		}

		// First get the user's current program
		const currentProgram = await prisma.programs.findFirst({
			where: {
				userId: parsedUserId,
				endDate: null,
			},
			include: {
				progressionSettings: true,
			},
		});

		logger.debug("Fetched user settings", {
			userId: parsedUserId,
			experienceLevel: userSettings.experienceLevel,
			useMetric: userSettings.useMetric,
			hasProgramGoal: !!currentProgram?.goal,
		});

		// Return all settings in a consistent format
		res.json({
			experienceLevel: userSettings.experienceLevel,
			barbellIncrement: Number(userSettings.barbellIncrement),
			dumbbellIncrement: Number(userSettings.dumbbellIncrement),
			cableIncrement: Number(userSettings.cableIncrement),
			machineIncrement: Number(userSettings.machineIncrement),
			useMetric: userSettings.useMetric,
			darkMode: userSettings.darkMode,
			programGoal: currentProgram?.goal || "HYPERTROPHY",
		});
	} catch (error) {
		logger.error(
			`Settings fetch error: ${error instanceof Error ? error.message : "Unknown error"}`,
			{
				stack: error instanceof Error ? error.stack : undefined,
				userId: req.user?.id,
			},
		);
		res.status(500).json({ error: "Internal server error" });
	}
});

// Update user settings
router.patch("/user-settings", authenticateToken, async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			logger.warn("Unauthorized attempt to update user settings");
			return res.status(401).json({ error: "Unauthorized" });
		}

		const parsedUserId =
			typeof userId === "string" ? Number.parseInt(userId, 10) : userId;

		const {
			experienceLevel,
			barbellIncrement,
			dumbbellIncrement,
			cableIncrement,
			machineIncrement,
			useMetric,
			darkMode,
		} = req.body;

		// Log which settings are being updated
		logger.debug("Updating user settings", {
			userId: parsedUserId,
			fieldsToUpdate: {
				experienceLevel: experienceLevel !== undefined,
				barbellIncrement: barbellIncrement !== undefined,
				dumbbellIncrement: dumbbellIncrement !== undefined,
				cableIncrement: cableIncrement !== undefined,
				machineIncrement: machineIncrement !== undefined,
				useMetric: useMetric !== undefined,
				darkMode: darkMode !== undefined,
			},
		});

		// Update user settings
		await prisma.user_settings.upsert({
			where: {
				user_id: parsedUserId,
			},
			create: {
				user_id: parsedUserId,
				experienceLevel: experienceLevel || "BEGINNER",
				barbellIncrement: barbellIncrement || 2.5,
				dumbbellIncrement: dumbbellIncrement || 2.0,
				cableIncrement: cableIncrement || 2.5,
				machineIncrement: machineIncrement || 5.0,
				useMetric: useMetric !== undefined ? useMetric : true,
				darkMode: darkMode !== undefined ? darkMode : true,
			},
			update: {
				...(experienceLevel && { experienceLevel }),
				...(barbellIncrement && { barbellIncrement }),
				...(dumbbellIncrement && { dumbbellIncrement }),
				...(cableIncrement && { cableIncrement }),
				...(machineIncrement && { machineIncrement }),
				...(useMetric !== undefined && { useMetric }),
				...(darkMode !== undefined && { darkMode }),
			},
		});

		// If experienceLevel is provided, also update the program progression settings
		if (experienceLevel) {
			logger.debug(
				"Updating program progression settings with new experience level",
				{
					userId: parsedUserId,
					experienceLevel,
				},
			);

			// First get or create current program
			let currentProgram = await prisma.programs.findFirst({
				where: {
					userId: parsedUserId,
					endDate: null,
				},
			});

			if (!currentProgram) {
				// Create a default program if none exists
				logger.info("Creating default program for user settings", {
					userId: parsedUserId,
				});
				currentProgram = await prisma.programs.create({
					data: {
						name: "Default Program",
						userId: parsedUserId,
						goal: "HYPERTROPHY",
						programType: "AUTOMATED",
					},
				});
			}

			// Update or create program progression settings
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

		const updatedSettings = await prisma.user_settings.findUnique({
			where: { user_id: parsedUserId },
		});

		logger.info("User settings updated successfully", {
			userId: parsedUserId,
			experienceLevel: updatedSettings?.experienceLevel,
			updateProgramSettings: experienceLevel !== undefined,
		});

		res.json({
			message: "Settings updated successfully",
			settings: updatedSettings,
		});
	} catch (error) {
		logger.error(
			`Settings update error: ${error instanceof Error ? error.message : "Unknown error"}`,
			{
				stack: error instanceof Error ? error.stack : undefined,
				userId: req.user?.id,
				requestBody: JSON.stringify(req.body),
			},
		);
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
