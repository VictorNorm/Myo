import type { Request, Response } from "express";
import { param, query, validationResult } from "express-validator";
import { success, error, validationError, ErrorCodes } from "../../types/responses";
import { statsService, type TimeFrameType } from "../services/statsService";
import { statsRepository } from "../services/repositories/statsRepository";
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
			.isIn(["week", "month", "program", "all", "custom"])
			.withMessage("Time frame must be one of: week, month, program, all, custom"),
		query("exerciseId")
			.optional()
			.isInt({ min: 1 })
			.withMessage("Exercise ID must be a positive integer"),
		query("muscleGroupId")
			.optional()
			.isInt({ min: 1 })
			.withMessage("Muscle group ID must be a positive integer"),
		query("startDate")
			.optional()
			.isISO8601()
			.withMessage("Start date must be valid ISO 8601 format"),
		query("endDate")
			.optional()
			.isISO8601()
			.withMessage("End date must be valid ISO 8601 format"),
		query("excludeBadDays")
			.optional()
			.isBoolean()
			.withMessage("excludeBadDays must be true or false"),
	],

	getWorkoutProgress: [
		param("programId")
			.isInt({ min: 1 })
			.withMessage("Program ID must be a positive integer"),
		query("timeFrame")
			.optional()
			.isIn(["week", "month", "program", "all", "custom"])
			.withMessage("Time frame must be one of: week, month, program, all, custom"),
		query("startDate")
			.optional()
			.isISO8601()
			.withMessage("Start date must be valid ISO 8601 format"),
		query("endDate")
			.optional()
			.isISO8601()
			.withMessage("End date must be valid ISO 8601 format"),
		query("excludeBadDays")
			.optional()
			.isBoolean()
			.withMessage("excludeBadDays must be true or false"),
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
				return res.status(400).json(validationError(errors.array()));
			}

			if (!req.user?.id) {
				return res.status(401).json(
					error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
				);
			}

			const programId = Number(req.params.programId);
			const userId = req.user.id;

			const progressionData = await statsService.getExerciseProgression(
				programId,
				userId
			);

			return res.status(200).json(
				success(progressionData, "Exercise progression data retrieved successfully")
			);

		} catch (err) {
			logger.error(
				`Error fetching exercise progression: ${err instanceof Error ? err.message : "Unknown error"}`,
				{
					stack: err instanceof Error ? err.stack : undefined,
					programId: req.params.programId,
					userId: req.user?.id,
				}
			);

			if (err instanceof Error && err.message.includes("not found")) {
				return res.status(404).json(
					error(ErrorCodes.NOT_FOUND, err.message)
				);
			}

			return res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to retrieve exercise progression",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	// GET /completed-exercises/programs/:programId
	getCompletedExercises: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json(validationError(errors.array()));
			}

			if (!req.user?.id) {
				return res.status(401).json(
					error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
				);
			}

			const programId = Number(req.params.programId);
			const userId = req.user.id;
			const timeFrame = (req.query.timeFrame as TimeFrameType) || "all";

			const filters = {
				exerciseId: req.query.exerciseId ? Number(req.query.exerciseId) : undefined,
				muscleGroupId: req.query.muscleGroupId ? Number(req.query.muscleGroupId) : undefined,
				startDate: req.query.startDate as string | undefined,
				endDate: req.query.endDate as string | undefined,
				excludeBadDays: req.query.excludeBadDays === 'false' ? false : true // Default to true
			};

			const volumeData = await statsService.getVolumeData(
				programId,
				userId,
				timeFrame,
				filters
			);

			return res.status(200).json(
				success(volumeData, "Volume data retrieved successfully")
			);

		} catch (err) {
			logger.error(
				`Error fetching completed exercises: ${err instanceof Error ? err.message : "Unknown error"}`,
				{
					stack: err instanceof Error ? err.stack : undefined,
					programId: req.params.programId,
					userId: req.user?.id,
					timeFrame: req.query.timeFrame,
				}
			);

			if (err instanceof Error && err.message.includes("not found")) {
				return res.status(404).json(
					error(ErrorCodes.NOT_FOUND, err.message)
				);
			}

			return res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to retrieve volume data",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	// GET /workout-progress/programs/:programId
	getWorkoutProgress: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json(validationError(errors.array()));
			}

			if (!req.user?.id) {
				return res.status(401).json(
					error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
				);
			}

			const programId = Number(req.params.programId);
			const userId = req.user.id;
			const timeFrame = (req.query.timeFrame as TimeFrameType) || "all";

			const filters = {
				startDate: req.query.startDate as string | undefined,
				endDate: req.query.endDate as string | undefined,
				excludeBadDays: req.query.excludeBadDays === 'false' ? false : true // Default to true
			};

			const frequencyData = await statsService.getWorkoutFrequencyData(
				programId,
				userId,
				timeFrame,
				filters
			);

			return res.status(200).json(
				success(frequencyData, "Workout progress data retrieved successfully")
			);

		} catch (err) {
			logger.error(
				`Error fetching workout progress: ${err instanceof Error ? err.message : "Unknown error"}`,
				{
					stack: err instanceof Error ? err.stack : undefined,
					programId: req.params.programId,
					userId: req.user?.id,
					timeFrame: req.query.timeFrame,
				}
			);

			if (err instanceof Error && err.message.includes("not found")) {
				return res.status(404).json(
					error(ErrorCodes.NOT_FOUND, err.message)
				);
			}

			return res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to retrieve workout progress",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	// GET /programs/:programId/statistics
	getProgramStatistics: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json(validationError(errors.array()));
			}

			if (!req.user?.id) {
				return res.status(401).json(
					error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
				);
			}

			const programId = Number(req.params.programId);
			const userId = req.user.id;

			const statisticsData = await statsService.getProgramStatistics(
				programId,
				userId
			);

			return res.status(200).json(
				success(statisticsData, "Program statistics retrieved successfully")
			);

		} catch (err) {
			logger.error(
				`Error fetching program statistics: ${err instanceof Error ? err.message : "Unknown error"}`,
				{
					stack: err instanceof Error ? err.stack : undefined,
					programId: req.params.programId,
					userId: req.user?.id,
				}
			);

			if (err instanceof Error && err.message.includes("not found")) {
				return res.status(404).json(
					error(ErrorCodes.NOT_FOUND, err.message)
				);
			}

			return res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to retrieve program statistics",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},
};

// =====================================================
// CROSS-PROGRAM VALIDATORS (All Programs Stats)
// =====================================================

export const crossProgramValidators = {
	getExerciseProgressionAllPrograms: [],

	getVolumeAllPrograms: [
		query("timeFrame")
			.optional()
			.isIn(["week", "month", "program", "all", "custom"])
			.withMessage("Invalid time frame"),
		query("exerciseId")
			.optional()
			.isInt()
			.withMessage("Exercise ID must be an integer"),
		query("muscleGroupId")
			.optional()
			.isInt()
			.withMessage("Muscle group ID must be an integer"),
		query("startDate")
			.optional()
			.isISO8601()
			.withMessage("Start date must be a valid ISO date"),
		query("endDate")
			.optional()
			.isISO8601()
			.withMessage("End date must be a valid ISO date"),
		query("excludeBadDays")
			.optional()
			.isBoolean()
			.withMessage("excludeBadDays must be a boolean"),
	],

	getFrequencyAllPrograms: [
		query("timeFrame")
			.optional()
			.isIn(["week", "month", "program", "all", "custom"])
			.withMessage("Invalid time frame"),
		query("startDate")
			.optional()
			.isISO8601()
			.withMessage("Start date must be a valid ISO date"),
		query("endDate")
			.optional()
			.isISO8601()
			.withMessage("End date must be a valid ISO date"),
		query("excludeBadDays")
			.optional()
			.isBoolean()
			.withMessage("excludeBadDays must be a boolean"),
	],

	getAllUserExercises: [],
};

// =====================================================
// CROSS-PROGRAM CONTROLLER (All Programs Stats)
// =====================================================

export const crossProgramController = {
	/**
	 * GET /api/v2/stats/all-programs/progression
	 * Get exercise progression across ALL user programs
	 */
	getExerciseProgressionAllPrograms: async (req: Request, res: Response) => {
		try {
			if (!req.user?.id) {
				return res.status(401).json(
					error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
				);
			}

			const userId = req.user.id;

			const progressionData =
				await statsService.getExerciseProgressionAllPrograms(userId);

			logger.info(
				`Retrieved all-programs exercise progression for user ${userId}`,
				{ exerciseCount: progressionData.length }
			);

			return res.status(200).json(
				success(progressionData, "All programs exercise progression retrieved successfully")
			);
		} catch (err) {
			logger.error(
				`Error getting all-programs exercise progression: ${err instanceof Error ? err.message : "Unknown error"}`
			);
			return res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to get exercise progression",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	/**
	 * GET /api/v2/stats/all-programs/volume
	 * Get volume data across ALL user programs
	 */
	getVolumeAllPrograms: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json(validationError(errors.array()));
			}

			if (!req.user?.id) {
				return res.status(401).json(
					error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
				);
			}

			const userId = req.user.id;
			const {
				timeFrame = "month",
				exerciseId,
				muscleGroupId,
				startDate,
				endDate,
				excludeBadDays,
			} = req.query;

			const volumeData = await statsService.getVolumeDataAllPrograms(
				userId,
				timeFrame as TimeFrameType,
				{
					exerciseId: exerciseId ? Number(exerciseId) : undefined,
					muscleGroupId: muscleGroupId ? Number(muscleGroupId) : undefined,
					startDate: startDate as string | undefined,
					endDate: endDate as string | undefined,
					excludeBadDays: excludeBadDays === "false" ? false : true,
				}
			);

			logger.info(`Retrieved all-programs volume data for user ${userId}`, {
				timeFrame,
				totalVolume: volumeData.totalVolume,
			});

			return res.status(200).json(
				success(volumeData, "All programs volume data retrieved successfully")
			);
		} catch (err) {
			logger.error(
				`Error getting all-programs volume data: ${err instanceof Error ? err.message : "Unknown error"}`
			);
			return res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to get volume data",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	/**
	 * GET /api/v2/stats/all-programs/frequency
	 * Get workout frequency across ALL user programs
	 */
	getFrequencyAllPrograms: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json(validationError(errors.array()));
			}

			if (!req.user?.id) {
				return res.status(401).json(
					error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
				);
			}

			const userId = req.user.id;
			const {
				timeFrame = "month",
				startDate,
				endDate,
				excludeBadDays,
			} = req.query;

			const frequencyData =
				await statsService.getWorkoutFrequencyDataAllPrograms(
					userId,
					timeFrame as TimeFrameType,
					{
						startDate: startDate as string | undefined,
						endDate: endDate as string | undefined,
						excludeBadDays: excludeBadDays === "false" ? false : true,
					}
				);

			logger.info(
				`Retrieved all-programs frequency data for user ${userId}`,
				{
					timeFrame,
					totalWorkouts: frequencyData.totalWorkouts,
				}
			);

			return res.status(200).json(
				success(frequencyData, "All programs frequency data retrieved successfully")
			);
		} catch (err) {
			logger.error(
				`Error getting all-programs frequency data: ${err instanceof Error ? err.message : "Unknown error"}`
			);
			return res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to get frequency data",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	/**
	 * GET /api/v2/stats/all-programs/exercises
	 * Get all unique exercises the user has ever completed
	 */
	getAllUserExercises: async (req: Request, res: Response) => {
		try {
			if (!req.user?.id) {
				return res.status(401).json(
					error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
				);
			}

			const userId = req.user.id;

			const exercises = await statsRepository.getAllUserExercises(userId);

			logger.info(`Retrieved all exercises for user ${userId}`, {
				count: exercises.length,
			});

			return res.status(200).json(
				success(exercises, "All user exercises retrieved successfully")
			);
		} catch (err) {
			logger.error(
				`Error getting all user exercises: ${err instanceof Error ? err.message : "Unknown error"}`
			);
			return res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to get exercises",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},
};