import type { Request, Response } from "express";
import { param, query, validationResult } from "express-validator";
import { statsService, type TimeFrameType } from "../services/statsService";
import logger from "../services/logger";

export const statsValidators = {
	getExerciseProgression: [
		param("programId")
			.isInt({ min: 1 })
			.withMessage("Program ID must be a positive integer"),
	],

	getCompletedExercises: [
		param("programId")
			.isInt({ min: 1 })
			.withMessage("Program ID must be a positive integer"),
		query("timeFrame")
			.optional()
			.isIn(["week", "month", "program", "all"])
			.withMessage("Time frame must be one of: week, month, program, all"),
	],

	getWorkoutProgress: [
		param("programId")
			.isInt({ min: 1 })
			.withMessage("Program ID must be a positive integer"),
		query("timeFrame")
			.optional()
			.isIn(["week", "month", "program", "all"])
			.withMessage("Time frame must be one of: week, month, program, all"),
	],

	getProgramStatistics: [
		param("programId")
			.isInt({ min: 1 })
			.withMessage("Program ID must be a positive integer"),
	],
};

export const statsController = {
	// GET /progression/programs/:programId/exercises
	getExerciseProgression: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({
					errors: errors.array(),
					message: "Validation failed"
				});
			}

			if (!req.user?.id) {
				return res.status(401).json({
					error: "Authentication required",
					message: "User not authenticated"
				});
			}

			const programId = Number(req.params.programId);
			const userId = req.user.id;

			const progressionData = await statsService.getExerciseProgression(
				programId,
				userId
			);

			return res.status(200).json({
				data: progressionData,
				message: "Exercise progression data retrieved successfully"
			});

		} catch (error) {
			logger.error(
				`Error fetching exercise progression: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId: req.params.programId,
					userId: req.user?.id,
				}
			);

			if (error instanceof Error && error.message.includes("not found")) {
				return res.status(404).json({
					error: "Not found",
					message: error.message
				});
			}

			return res.status(500).json({
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error"
			});
		}
	},

	// GET /completed-exercises/programs/:programId
	getCompletedExercises: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({
					errors: errors.array(),
					message: "Validation failed"
				});
			}

			if (!req.user?.id) {
				return res.status(401).json({
					error: "Authentication required",
					message: "User not authenticated"
				});
			}

			const programId = Number(req.params.programId);
			const userId = req.user.id;
			const timeFrame = (req.query.timeFrame as TimeFrameType) || "all";

			const volumeData = await statsService.getVolumeData(
				programId,
				userId,
				timeFrame
			);

			return res.status(200).json({
				data: volumeData,
				message: "Volume data retrieved successfully"
			});

		} catch (error) {
			logger.error(
				`Error fetching completed exercises: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId: req.params.programId,
					userId: req.user?.id,
					timeFrame: req.query.timeFrame,
				}
			);

			if (error instanceof Error && error.message.includes("not found")) {
				return res.status(404).json({
					error: "Not found",
					message: error.message
				});
			}

			return res.status(500).json({
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error"
			});
		}
	},

	// GET /workout-progress/programs/:programId
	getWorkoutProgress: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({
					errors: errors.array(),
					message: "Validation failed"
				});
			}

			if (!req.user?.id) {
				return res.status(401).json({
					error: "Authentication required",
					message: "User not authenticated"
				});
			}

			const programId = Number(req.params.programId);
			const userId = req.user.id;
			const timeFrame = (req.query.timeFrame as TimeFrameType) || "all";

			const frequencyData = await statsService.getWorkoutFrequencyData(
				programId,
				userId,
				timeFrame
			);

			return res.status(200).json({
				data: frequencyData,
				message: "Workout progress data retrieved successfully"
			});

		} catch (error) {
			logger.error(
				`Error fetching workout progress: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId: req.params.programId,
					userId: req.user?.id,
					timeFrame: req.query.timeFrame,
				}
			);

			if (error instanceof Error && error.message.includes("not found")) {
				return res.status(404).json({
					error: "Not found",
					message: error.message
				});
			}

			return res.status(500).json({
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error"
			});
		}
	},

	// GET /programs/:programId/statistics
	getProgramStatistics: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({
					errors: errors.array(),
					message: "Validation failed"
				});
			}

			if (!req.user?.id) {
				return res.status(401).json({
					error: "Authentication required",
					message: "User not authenticated"
				});
			}

			const programId = Number(req.params.programId);
			const userId = req.user.id;

			const statisticsData = await statsService.getProgramStatistics(
				programId,
				userId
			);

			return res.status(200).json({
				data: statisticsData,
				message: "Program statistics retrieved successfully"
			});

		} catch (error) {
			logger.error(
				`Error fetching program statistics: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId: req.params.programId,
					userId: req.user?.id,
				}
			);

			if (error instanceof Error && error.message.includes("not found")) {
				return res.status(404).json({
					error: "Not found",
					message: error.message
				});
			}

			return res.status(500).json({
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error"
			});
		}
	},
};