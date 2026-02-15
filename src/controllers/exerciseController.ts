import type { Request, Response } from "express";
import { success, error, validationError, ErrorCodes } from "../../types/responses";
import { exerciseService } from "../services/exerciseService";
import { body, param, validationResult } from "express-validator";
import logger from "../services/logger";

export const exerciseValidators = {
	create: [
		body("name").isString().notEmpty().withMessage("Exercise name is required"),
		body("equipment")
			.isIn(["DUMBBELL", "BARBELL", "CABLE", "MACHINE", "BODYWEIGHT"])
			.withMessage("Invalid equipment type"),
		body("category")
			.isIn(["COMPOUND", "ISOLATION"])
			.withMessage("Invalid exercise category"),
		body("videoUrl")
			.optional({ values: "null" })
			.isURL()
			.withMessage("Video URL must be a valid URL"),
		body("muscleGroupIds")
			.optional()
			.isArray()
			.withMessage("Muscle group IDs must be an array"),
		body("muscleGroupIds.*")
			.optional()
			.isInt({ min: 1 })
			.withMessage("Each muscle group ID must be a positive integer"),
		body("defaultIncrementKg")
			.optional()
			.isNumeric()
			.withMessage("Default increment must be a number"),
		body("minWeight")
			.optional()
			.isNumeric()
			.withMessage("Min weight must be a number"),
		body("maxWeight")
			.optional()
			.isNumeric()
			.withMessage("Max weight must be a number"),
	],
	update: [
		body("name")
			.optional()
			.isString()
			.notEmpty()
			.withMessage("Exercise name cannot be empty"),
		body("equipment")
			.optional()
			.isIn(["DUMBBELL", "BARBELL", "CABLE", "MACHINE", "BODYWEIGHT"])
			.withMessage("Invalid equipment type"),
		body("category")
			.optional()
			.isIn(["COMPOUND", "ISOLATION"])
			.withMessage("Invalid exercise category"),
		body("videoUrl")
			.optional({ values: "null" })
			.isURL()
			.withMessage("Video URL must be a valid URL"),
		body("muscleGroupIds")
			.optional()
			.isArray()
			.withMessage("Muscle group IDs must be an array"),
		body("muscleGroupIds.*")
			.optional()
			.isInt({ min: 1 })
			.withMessage("Each muscle group ID must be a positive integer"),
		body("defaultIncrementKg")
			.optional()
			.isNumeric()
			.withMessage("Default increment must be a number"),
		body("minWeight")
			.optional()
			.isNumeric()
			.withMessage("Min weight must be a number"),
		body("maxWeight")
			.optional()
			.isNumeric()
			.withMessage("Max weight must be a number"),
	],
	upsertExercisesToWorkout: [
		body("workoutId").isInt({ min: 1 }).withMessage("Valid workout ID is required"),
		body("exercises").isArray().withMessage("Exercises must be an array"),
		body("exercises.*.id").isInt({ min: 1 }).withMessage("Each exercise must have a valid ID"),
		body("exercises.*.sets").isInt({ min: 1 }).withMessage("Sets must be a positive integer"),
		body("exercises.*.reps").isInt({ min: 1 }).withMessage("Reps must be a positive integer"),
		body("exercises.*.weight").isNumeric().withMessage("Weight must be a number"),
		body("exercises.*.notes").optional().isString().withMessage("Notes must be a string"),
		body("supersets").optional().isArray().withMessage("Supersets must be an array"),
		body("supersets.*.first_exercise_id").optional().isInt({ min: 1 }).withMessage("First exercise ID must be valid"),
		body("supersets.*.second_exercise_id").optional().isInt({ min: 1 }).withMessage("Second exercise ID must be valid"),
	],
	getProgramExercises: [
		param("programId")
			.isInt({ min: 1 })
			.withMessage("Program ID must be a positive integer"),
	],
};

export const exerciseController = {
	getAllExercises: async (req: Request, res: Response) => {
		try {
			const exercises = await exerciseService.getAllExercises();
			res.status(200).json(
				success(exercises, "Exercises fetched successfully")
			);
		} catch (err) {
			logger.error("Error fetching exercises:", err);
			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to fetch exercises",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	getExerciseById: async (req: Request, res: Response) => {
		try {
			const id = Number(req.params.id);

			if (isNaN(id)) {
				return res.status(400).json(
					error("invalid_id", "Invalid exercise ID")
				);
			}

			const exercise = await exerciseService.getExerciseById(id);

			if (!exercise) {
				return res.status(404).json(
					error(ErrorCodes.NOT_FOUND, "Exercise not found")
				);
			}

			res.status(200).json(
				success(exercise, "Exercise fetched successfully")
			);
		} catch (err) {
			logger.error("Error fetching exercise:", err);
			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to fetch exercise",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	createExercise: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json(validationError(errors.array()));
			}

			const exercise = await exerciseService.createExercise(req.body);
			res.status(201).json(
				success(exercise, "Exercise created successfully")
			);
		} catch (err) {
			logger.error("Error creating exercise:", err);
			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to create exercise",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	updateExercise: async (req: Request, res: Response) => {
		try {
			const id = Number(req.params.id);

			if (Number.isNaN(id)) {
				return res.status(400).json(
					error("invalid_id", "Invalid exercise ID")
				);
			}

			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json(validationError(errors.array()));
			}

			const exercise = await exerciseService.updateExercise(id, req.body);
			res.status(200).json(
				success(exercise, "Exercise updated successfully")
			);
		} catch (err) {
			logger.error("Error updating exercise:", err);
			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to update exercise",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	deleteExercise: async (req: Request, res: Response) => {
		try {
			const id = Number(req.params.id);

			if (isNaN(id)) {
				return res.status(400).json(
					error("invalid_id", "Invalid exercise ID")
				);
			}

			await exerciseService.deleteExercise(id);
			res.status(204).send();
		} catch (err) {
			logger.error("Error deleting exercise:", err);
			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to delete exercise",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	getProgramExercises: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json(validationError(errors.array()));
			}

			const programId = Number(req.params.programId);

			const exercises = await exerciseService.getExercisesByProgramId(programId);

			return res.status(200).json(
				success(exercises, "Program exercises fetched successfully")
			);

		} catch (err) {
			logger.error(
				`Error fetching exercises for program: ${err instanceof Error ? err.message : "Unknown error"}`,
				{
					stack: err instanceof Error ? err.stack : undefined,
					programId: req.params.programId,
					userId: req.user?.id
				}
			);
			return res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to fetch program exercises",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	upsertExercisesToWorkout: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json(validationError(errors.array()));
			}

			const { workoutId, exercises, supersets } = req.body;

			const result = await exerciseService.upsertExercisesToWorkout(
				workoutId,
				exercises,
				supersets
			);

			res.status(200).json(
				success(result, "Exercises updated successfully")
			);
		} catch (err) {
			logger.error("Error upserting exercises to workout:", err);
			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to update exercises",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},
};
