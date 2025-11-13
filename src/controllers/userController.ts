import type { Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import { success, error, validationError, ErrorCodes } from "../../types/responses";
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
			
			res.status(200).json(
				success(users, "Users fetched successfully")
			);
		} catch (err) {
			logger.error("Error in getAllUsers controller", {
				error: err instanceof Error ? err.message : "Unknown error",
				userId: req.user?.id
			});
			
			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to fetch users",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	getUserById: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json(validationError(errors.array()));
			}

			if (!req.user) {
				return res.status(401).json(
					error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
				);
			}

			const id = Number(req.params.id);
			
			try {
				const user = await userService.getUserById(id, {
					id: req.user.id,
					role: req.user.role
				});

				if (!user) {
					return res.status(404).json(
						error(ErrorCodes.NOT_FOUND, `User with ID ${id} does not exist`)
					);
				}

				res.status(200).json(
					success(user, "User details fetched successfully")
				);
			} catch (serviceError) {
				if (serviceError instanceof Error && serviceError.message === "Unauthorized to view this user") {
					return res.status(403).json(
						error(ErrorCodes.FORBIDDEN, "You don't have permission to view this user")
					);
				}
				throw serviceError; // Re-throw other errors to be caught by outer catch
			}
		} catch (err) {
			logger.error("Error in getUserById controller", {
				error: err instanceof Error ? err.message : "Unknown error",
				requestedUserId: req.params.id,
				requestingUserId: req.user?.id
			});

			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to fetch user details",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	assignUserToTrainer: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json(validationError(errors.array()));
			}

			if (!req.user) {
				return res.status(401).json(
					error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
				);
			}

			const { userId } = req.body;
			const trainerId = req.user.id;

			try {
				await userService.assignUserToTrainer(userId, trainerId);
				
				res.status(200).json(
					success({
						userId,
						trainerId
					}, "User successfully assigned to trainer")
				);
			} catch (serviceError) {
				if (serviceError instanceof Error) {
					if (serviceError.message === "User not found") {
						return res.status(404).json(
							error(ErrorCodes.NOT_FOUND, "The specified user does not exist")
						);
					}
					if (serviceError.message === "Trainer not found") {
						return res.status(404).json(
							error(ErrorCodes.NOT_FOUND, "The specified trainer does not exist")
						);
					}
				}
				throw serviceError; // Re-throw other errors
			}
		} catch (err) {
			logger.error("Error in assignUserToTrainer controller", {
				error: err instanceof Error ? err.message : "Unknown error",
				userId: req.body.userId,
				trainerId: req.user?.id
			});

			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to assign user to trainer",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	getUsersByTrainer: async (req: Request, res: Response) => {
		try {
			if (!req.user) {
				return res.status(401).json(
					error(ErrorCodes.UNAUTHORIZED, "User not authenticated")
				);
			}

			// Only trainers and admins can access this endpoint
			if (req.user.role !== "TRAINER" && req.user.role !== "ADMIN") {
				return res.status(403).json(
					error(ErrorCodes.FORBIDDEN, "Only trainers and admins can access assigned users")
				);
			}

			const trainerId = req.user.id;
			const users = await userService.getUsersByTrainer(trainerId);
			
			res.status(200).json(
				success(users, "Assigned users fetched successfully")
			);
		} catch (err) {
			logger.error("Error in getUsersByTrainer controller", {
				error: err instanceof Error ? err.message : "Unknown error",
				trainerId: req.user?.id
			});
			
			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to fetch assigned users",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	}
};