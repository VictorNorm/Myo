import type { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { userSettingsService } from "../services/userSettingsService";
import logger from "../services/logger";

export const userSettingsValidators = {
	updateSettings: [
		body("experienceLevel")
			.optional()
			.isIn(["BEGINNER", "INTERMEDIATE", "ADVANCED"])
			.withMessage("Experience level must be BEGINNER, INTERMEDIATE, or ADVANCED"),
		body("barbellIncrement")
			.optional()
			.isFloat({ min: 0.1, max: 100 })
			.withMessage("Barbell increment must be between 0.1 and 100"),
		body("dumbbellIncrement")
			.optional()
			.isFloat({ min: 0.1, max: 100 })
			.withMessage("Dumbbell increment must be between 0.1 and 100"),
		body("cableIncrement")
			.optional()
			.isFloat({ min: 0.1, max: 100 })
			.withMessage("Cable increment must be between 0.1 and 100"),
		body("machineIncrement")
			.optional()
			.isFloat({ min: 0.1, max: 100 })
			.withMessage("Machine increment must be between 0.1 and 100"),
		body("useMetric")
			.optional()
			.isBoolean()
			.withMessage("useMetric must be a boolean"),
		body("darkMode")
			.optional()
			.isBoolean()
			.withMessage("darkMode must be a boolean"),
	],
};

export const userSettingsController = {
	getUserSettings: async (req: Request, res: Response) => {
		try {
			if (!req.user?.id) {
				return res.status(401).json({
					error: "Authentication required",
					message: "User not authenticated"
				});
			}

			const userId = req.user.id;
			const settings = await userSettingsService.getUserSettings(userId);
			
			res.status(200).json({
				data: settings,
				message: "User settings fetched successfully"
			});
		} catch (error) {
			if (error instanceof Error && error.message === "User not found") {
				return res.status(404).json({
					error: "User not found",
					message: "The specified user does not exist"
				});
			}

			logger.error("Error in getUserSettings controller", {
				error: error instanceof Error ? error.message : "Unknown error",
				userId: req.user?.id
			});
			
			res.status(500).json({
				error: "Failed to fetch user settings",
				details: error instanceof Error ? error.message : "Internal server error"
			});
		}
	},

	updateUserSettings: async (req: Request, res: Response) => {
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

			const userId = req.user.id;
			const updateData = req.body;

			// Additional custom validation
			const validationErrors = userSettingsService.validateUpdateData(updateData);
			if (validationErrors.length > 0) {
				return res.status(400).json({
					errors: validationErrors.map(error => ({ msg: error })),
					message: "Validation failed"
				});
			}

			const updatedSettings = await userSettingsService.updateUserSettings(userId, updateData);
			
			res.status(200).json({
				data: updatedSettings,
				message: "User settings updated successfully"
			});
		} catch (error) {
			if (error instanceof Error && error.message === "User not found") {
				return res.status(404).json({
					error: "User not found",
					message: "The specified user does not exist"
				});
			}

			logger.error("Error in updateUserSettings controller", {
				error: error instanceof Error ? error.message : "Unknown error",
				userId: req.user?.id,
				requestBody: req.body
			});
			
			res.status(500).json({
				error: "Failed to update user settings",
				details: error instanceof Error ? error.message : "Internal server error"
			});
		}
	},

	// Get default settings (useful for frontend to show defaults)
	getDefaultSettings: async (req: Request, res: Response) => {
		try {
			const defaultSettings = {
				experienceLevel: "BEGINNER",
				barbellIncrement: 2.5,
				dumbbellIncrement: 2.0,
				cableIncrement: 2.5,
				machineIncrement: 5.0,
				useMetric: true,
				darkMode: true,
				programGoal: "HYPERTROPHY",
			};

			res.status(200).json({
				data: defaultSettings,
				message: "Default settings retrieved successfully"
			});
		} catch (error) {
			logger.error("Error in getDefaultSettings controller", {
				error: error instanceof Error ? error.message : "Unknown error"
			});
			
			res.status(500).json({
				error: "Failed to fetch default settings",
				details: error instanceof Error ? error.message : "Internal server error"
			});
		}
	},

	// Reset settings to defaults
	resetUserSettings: async (req: Request, res: Response) => {
		try {
			if (!req.user?.id) {
				return res.status(401).json({
					error: "Authentication required",
					message: "User not authenticated"
				});
			}

			const userId = req.user.id;
			const defaultUpdateData = {
				experienceLevel: "BEGINNER",
				barbellIncrement: 2.5,
				dumbbellIncrement: 2.0,
				cableIncrement: 2.5,
				machineIncrement: 5.0,
				useMetric: true,
				darkMode: true,
			};

			const resetSettings = await userSettingsService.updateUserSettings(userId, defaultUpdateData);
			
			res.status(200).json({
				data: resetSettings,
				message: "User settings reset to defaults successfully"
			});
		} catch (error) {
			if (error instanceof Error && error.message === "User not found") {
				return res.status(404).json({
					error: "User not found",
					message: "The specified user does not exist"
				});
			}

			logger.error("Error in resetUserSettings controller", {
				error: error instanceof Error ? error.message : "Unknown error",
				userId: req.user?.id
			});
			
			res.status(500).json({
				error: "Failed to reset user settings",
				details: error instanceof Error ? error.message : "Internal server error"
			});
		}
	}
};