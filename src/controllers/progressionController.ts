import type { Request, Response } from "express";
import { param, validationResult } from "express-validator";
import { progressionService } from "../services/progressionService";
import logger from "../services/logger";

export const progressionValidators = {
	getExerciseProgression: [
		param("workoutId")
			.isInt({ min: 1 })
			.withMessage("Workout ID must be a positive integer"),
		param("exerciseId")
			.isInt({ min: 1 })
			.withMessage("Exercise ID must be a positive integer"),
	],
	getWorkoutProgression: [
		param("workoutId")
			.isInt({ min: 1 })
			.withMessage("Workout ID must be a positive integer"),
	],
	getProgressionStats: [
		param("exerciseId")
			.isInt({ min: 1 })
			.withMessage("Exercise ID must be a positive integer"),
		param("programId")
			.isInt({ min: 1 })
			.withMessage("Program ID must be a positive integer"),
	],
};

export const progressionController = {
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

			const workoutId = Number(req.params.workoutId);
			const exerciseId = Number(req.params.exerciseId);
			const userId = req.user.id;

			const progressionData = await progressionService.getExerciseProgression(
				workoutId, 
				exerciseId, 
				userId
			);

			res.status(200).json({
				data: progressionData,
				message: "Exercise progression data fetched successfully"
			});
		} catch (error) {
			if (error instanceof Error && error.message === "Workout not found or has no program") {
				return res.status(404).json({
					error: "Workout not found",
					message: "The specified workout does not exist or has no associated program"
				});
			}

			logger.error("Error in getExerciseProgression controller", {
				error: error instanceof Error ? error.message : "Unknown error",
				workoutId: req.params.workoutId,
				exerciseId: req.params.exerciseId,
				userId: req.user?.id
			});

			res.status(500).json({
				error: "Failed to fetch exercise progression",
				details: error instanceof Error ? error.message : "Internal server error"
			});
		}
	},

	getWorkoutProgression: async (req: Request, res: Response) => {
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

			const workoutId = Number(req.params.workoutId);
			const userId = req.user.id;

			const progressionData = await progressionService.getWorkoutProgression(
				workoutId, 
				userId
			);

			res.status(200).json({
				data: progressionData,
				message: "Workout progression data fetched successfully"
			});
		} catch (error) {
			if (error instanceof Error && error.message === "Workout not found or has no program") {
				return res.status(404).json({
					error: "Workout not found",
					message: "The specified workout does not exist or has no associated program"
				});
			}

			logger.error("Error in getWorkoutProgression controller", {
				error: error instanceof Error ? error.message : "Unknown error",
				workoutId: req.params.workoutId,
				userId: req.user?.id
			});

			res.status(500).json({
				error: "Failed to fetch workout progression",
				details: error instanceof Error ? error.message : "Internal server error"
			});
		}
	},

	getProgressionStats: async (req: Request, res: Response) => {
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

			const exerciseId = Number(req.params.exerciseId);
			const programId = Number(req.params.programId);
			const userId = req.user.id;

			const stats = await progressionService.getProgressionStats(
				exerciseId,
				userId,
				programId
			);

			res.status(200).json({
				data: stats,
				message: "Progression statistics fetched successfully"
			});
		} catch (error) {
			logger.error("Error in getProgressionStats controller", {
				error: error instanceof Error ? error.message : "Unknown error",
				exerciseId: req.params.exerciseId,
				programId: req.params.programId,
				userId: req.user?.id
			});

			res.status(500).json({
				error: "Failed to fetch progression statistics",
				details: error instanceof Error ? error.message : "Internal server error"
			});
		}
	},

	// Get progression data for all exercises across all programs for a user
	getUserProgressionOverview: async (req: Request, res: Response) => {
		try {
			if (!req.user?.id) {
				return res.status(401).json({
					error: "Authentication required",
					message: "User not authenticated"
				});
			}

			// This would require more complex queries - placeholder for future enhancement
			// For now, return empty overview
			const overview = {
				totalExercises: 0,
				totalProgressions: 0,
				averageProgressionRate: 0,
				topProgressingExercises: [],
				recentProgressions: [],
			};

			res.status(200).json({
				data: overview,
				message: "User progression overview fetched successfully"
			});
		} catch (error) {
			logger.error("Error in getUserProgressionOverview controller", {
				error: error instanceof Error ? error.message : "Unknown error",
				userId: req.user?.id
			});

			res.status(500).json({
				error: "Failed to fetch user progression overview",
				details: error instanceof Error ? error.message : "Internal server error"
			});
		}
	}
};