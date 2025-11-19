import type { Request, Response } from "express";
import { param, validationResult } from "express-validator";
import { templateService } from "../services/templateService";
import logger from "../services/logger";

export const templateValidators = {
	getWorkoutTemplate: [
		param("workoutId")
			.isInt({ min: 1 })
			.withMessage("Workout ID must be a positive integer"),
	],
};

export const templateController = {
	getWorkoutTemplate: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ 
					errors: errors.array(),
					message: "Validation failed"
				});
			}

			if (!req.user?.id) {
				logger.warn(
					"Attempted to access workout template without authentication"
				);
				return res.status(401).json({
					error: "Authentication required",
					message: "User not authenticated"
				});
			}

			const workoutId = Number(req.params.workoutId);
			const userId = req.user.id;

			const templateData = await templateService.getWorkoutTemplate(workoutId, userId);

			return res.status(200).json({
				data: templateData,
				message: "Workout template retrieved successfully"
			});

		} catch (error) {
			logger.error(
				`Error fetching workout template: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					workoutId: Number(req.params.workoutId),
					userId: req.user?.id,
				}
			);

			// Handle specific business logic errors
			if (error instanceof Error) {
				if (error.message === "Workout not found") {
					return res.status(404).json({ 
						error: "Workout not found",
						message: "The specified workout does not exist"
					});
				}
				
				if (error.message === "Workout is not associated with a program") {
					return res.status(400).json({ 
						error: "Invalid workout",
						message: "Workout is not associated with a program"
					});
				}
			}

			return res.status(500).json({
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
				stack:
					process.env.NODE_ENV === "development" && error instanceof Error
						? error.stack
						: undefined,
			});
		}
	},
};