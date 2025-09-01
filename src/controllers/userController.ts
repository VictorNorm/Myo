import type { Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import { userService } from "../services/userService";
import logger from "../services/logger";

export const userValidators = {
	assignUser: [
		body("userId")
			.isInt({ min: 1 })
			.withMessage("User ID must be a positive integer"),
	],
	getUserById: [
		param("id")
			.isInt({ min: 1 })
			.withMessage("User ID must be a positive integer"),
	],
};

export const userController = {
	getAllUsers: async (req: Request, res: Response) => {
		try {
			const users = await userService.getAllUsers();
			
			res.status(200).json({
				data: users,
				message: "Users fetched successfully"
			});
		} catch (error) {
			logger.error("Error in getAllUsers controller", {
				error: error instanceof Error ? error.message : "Unknown error",
				userId: req.user?.id
			});
			
			res.status(500).json({
				error: "Failed to fetch users",
				details: error instanceof Error ? error.message : "Internal server error"
			});
		}
	},

	getUserById: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ 
					errors: errors.array(),
					message: "Validation failed"
				});
			}

			if (!req.user) {
				return res.status(401).json({
					error: "Authentication required",
					message: "User not authenticated"
				});
			}

			const id = Number(req.params.id);
			
			try {
				const user = await userService.getUserById(id, {
					id: req.user.id,
					role: req.user.role
				});

				if (!user) {
					return res.status(404).json({
						error: "User not found",
						message: `User with ID ${id} does not exist`
					});
				}

				res.status(200).json({
					data: user,
					message: "User details fetched successfully"
				});
			} catch (serviceError) {
				if (serviceError instanceof Error && serviceError.message === "Unauthorized to view this user") {
					return res.status(403).json({
						error: "Unauthorized",
						message: "You don't have permission to view this user"
					});
				}
				throw serviceError; // Re-throw other errors to be caught by outer catch
			}
		} catch (error) {
			logger.error("Error in getUserById controller", {
				error: error instanceof Error ? error.message : "Unknown error",
				requestedUserId: req.params.id,
				requestingUserId: req.user?.id
			});

			res.status(500).json({
				error: "Failed to fetch user details",
				details: error instanceof Error ? error.message : "Internal server error"
			});
		}
	},

	assignUserToTrainer: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ 
					errors: errors.array(),
					message: "Validation failed"
				});
			}

			if (!req.user) {
				return res.status(401).json({
					error: "Authentication required",
					message: "User not authenticated"
				});
			}

			const { userId } = req.body;
			const trainerId = req.user.id;

			try {
				await userService.assignUserToTrainer(userId, trainerId);
				
				res.status(200).json({
					message: "User successfully assigned to trainer",
					data: {
						userId,
						trainerId
					}
				});
			} catch (serviceError) {
				if (serviceError instanceof Error) {
					if (serviceError.message === "User not found") {
						return res.status(404).json({
							error: "User not found",
							message: "The specified user does not exist"
						});
					}
					if (serviceError.message === "Trainer not found") {
						return res.status(404).json({
							error: "Trainer not found", 
							message: "The specified trainer does not exist"
						});
					}
				}
				throw serviceError; // Re-throw other errors
			}
		} catch (error) {
			logger.error("Error in assignUserToTrainer controller", {
				error: error instanceof Error ? error.message : "Unknown error",
				userId: req.body.userId,
				trainerId: req.user?.id
			});

			res.status(500).json({
				error: "Failed to assign user to trainer",
				details: error instanceof Error ? error.message : "Internal server error"
			});
		}
	},

	getUsersByTrainer: async (req: Request, res: Response) => {
		try {
			if (!req.user) {
				return res.status(401).json({
					error: "Authentication required",
					message: "User not authenticated"
				});
			}

			// Only trainers and admins can access this endpoint
			if (req.user.role !== "TRAINER" && req.user.role !== "ADMIN") {
				return res.status(403).json({
					error: "Unauthorized",
					message: "Only trainers and admins can access assigned users"
				});
			}

			const trainerId = req.user.id;
			const users = await userService.getUsersByTrainer(trainerId);
			
			res.status(200).json({
				data: users,
				message: "Assigned users fetched successfully"
			});
		} catch (error) {
			logger.error("Error in getUsersByTrainer controller", {
				error: error instanceof Error ? error.message : "Unknown error",
				trainerId: req.user?.id
			});
			
			res.status(500).json({
				error: "Failed to fetch assigned users",
				details: error instanceof Error ? error.message : "Internal server error"
			});
		}
	}
};