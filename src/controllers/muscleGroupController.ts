import type { Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import { success, error, validationError, ErrorCodes } from "../../types/responses";
import { muscleGroupService } from "../services/muscleGroupService";
import logger from "../services/logger";

export const muscleGroupValidators = {
	create: [
		body("name")
			.isString()
			.notEmpty()
			.withMessage("Muscle group name is required")
			.isLength({ min: 2, max: 50 })
			.withMessage("Muscle group name must be between 2 and 50 characters")
			.trim(),
	],
	update: [
		param("id")
			.isInt({ min: 1 })
			.withMessage("Invalid muscle group ID"),
		body("name")
			.optional()
			.isString()
			.notEmpty()
			.withMessage("Muscle group name cannot be empty")
			.isLength({ min: 2, max: 50 })
			.withMessage("Muscle group name must be between 2 and 50 characters")
			.trim(),
	],
	getById: [
		param("id")
			.isInt({ min: 1 })
			.withMessage("Invalid muscle group ID"),
	],
	deleteById: [
		param("id")
			.isInt({ min: 1 })
			.withMessage("Invalid muscle group ID"),
	],
};

export const muscleGroupController = {
	getAllMuscleGroups: async (req: Request, res: Response) => {
		try {
			const muscleGroups = await muscleGroupService.getAllMuscleGroups();
			
			res.status(200).json(
				success(muscleGroups, "Muscle groups fetched successfully")
			);
		} catch (err) {
			logger.error("Error in getAllMuscleGroups controller", {
				error: err instanceof Error ? err.message : "Unknown error",
				userId: req.user?.id
			});
			
			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to fetch muscle groups",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	getMuscleGroupById: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json(validationError(errors.array()));
			}

			const id = Number(req.params.id);
			const muscleGroup = await muscleGroupService.getMuscleGroupById(id);

			if (!muscleGroup) {
				return res.status(404).json(
					error(ErrorCodes.NOT_FOUND, `Muscle group with ID ${id} does not exist`)
				);
			}

			res.status(200).json(
				success(muscleGroup, "Muscle group fetched successfully")
			);
		} catch (err) {
			logger.error("Error in getMuscleGroupById controller", {
				error: err instanceof Error ? err.message : "Unknown error",
				muscleGroupId: req.params.id,
				userId: req.user?.id
			});

			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to fetch muscle group",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	createMuscleGroup: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json(validationError(errors.array()));
			}

			const muscleGroup = await muscleGroupService.createMuscleGroup(req.body);

			res.status(201).json(
				success(muscleGroup, "Muscle group created successfully")
			);
		} catch (err) {
			logger.error("Error in createMuscleGroup controller", {
				error: err instanceof Error ? err.message : "Unknown error",
				requestBody: req.body,
				userId: req.user?.id
			});

			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to create muscle group",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	updateMuscleGroup: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json(validationError(errors.array()));
			}

			const id = Number(req.params.id);
			const muscleGroup = await muscleGroupService.updateMuscleGroup(id, req.body);

			res.status(200).json({
				data: muscleGroup,
				message: "Muscle group updated successfully"
			});
		} catch (err) {
			logger.error("Error in updateMuscleGroup controller", {
				error: err instanceof Error ? err.message : "Unknown error",
				muscleGroupId: req.params.id,
				requestBody: req.body,
				userId: req.user?.id
			});

			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to update muscle group",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	deleteMuscleGroup: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json(validationError(errors.array()));
			}

			const id = Number(req.params.id);
			await muscleGroupService.deleteMuscleGroup(id);

			res.status(204).send();
		} catch (err) {
			logger.error("Error in deleteMuscleGroup controller", {
				error: err instanceof Error ? err.message : "Unknown error",
				muscleGroupId: req.params.id,
				userId: req.user?.id
			});

			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to delete muscle group",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	}
};