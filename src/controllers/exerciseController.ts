import type { Request, Response } from "express";
import { exerciseService } from "../services/exerciseService";
import { body, validationResult } from "express-validator";
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
		body("notes").optional().isString(),
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
		body("notes").optional().isString(),
	],
	upsertExercisesToWorkout: [
		body("workoutId").isInt({ min: 1 }).withMessage("Valid workout ID is required"),
		body("exercises").isArray().withMessage("Exercises must be an array"),
		body("exercises.*.id").isInt({ min: 1 }).withMessage("Each exercise must have a valid ID"),
		body("exercises.*.sets").isInt({ min: 1 }).withMessage("Sets must be a positive integer"),
		body("exercises.*.reps").isInt({ min: 1 }).withMessage("Reps must be a positive integer"),
		body("exercises.*.weight").isNumeric().withMessage("Weight must be a number"),
		body("supersets").optional().isArray().withMessage("Supersets must be an array"),
		body("supersets.*.first_exercise_id").optional().isInt({ min: 1 }).withMessage("First exercise ID must be valid"),
		body("supersets.*.second_exercise_id").optional().isInt({ min: 1 }).withMessage("Second exercise ID must be valid"),
	],
};

export const exerciseController = {
	getAllExercises: async (req: Request, res: Response) => {
		try {
			const exercises = await exerciseService.getAllExercises();
			res.status(200).json(exercises);
		} catch (error) {
			logger.error("Error fetching exercises:", error);
			res.status(500).json({
				error: "Failed to fetch exercises",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},

	getExerciseById: async (req: Request, res: Response) => {
		try {
			const id = Number(req.params.id);

			if (isNaN(id)) {
				return res.status(400).json({ error: "Invalid exercise ID" });
			}

			const exercise = await exerciseService.getExerciseById(id);

			if (!exercise) {
				return res.status(404).json({ error: "Exercise not found" });
			}

			res.status(200).json(exercise);
		} catch (error) {
			logger.error("Error fetching exercise:", error);
			res.status(500).json({
				error: "Failed to fetch exercise",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},

	createExercise: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() });
			}

			const exercise = await exerciseService.createExercise(req.body);
			res.status(201).json(exercise);
		} catch (error) {
			logger.error("Error creating exercise:", error);
			res.status(500).json({
				error: "Failed to create exercise",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},

	updateExercise: async (req: Request, res: Response) => {
		try {
			const id = Number(req.params.id);

			if (Number.isNaN(id)) {
				return res.status(400).json({ error: "Invalid exercise ID" });
			}

			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() });
			}

			const exercise = await exerciseService.updateExercise(id, req.body);
			res.status(200).json(exercise);
		} catch (error) {
			logger.error("Error updating exercise:", error);
			res.status(500).json({
				error: "Failed to update exercise",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},

	deleteExercise: async (req: Request, res: Response) => {
		try {
			const id = Number(req.params.id);

			if (isNaN(id)) {
				return res.status(400).json({ error: "Invalid exercise ID" });
			}

			await exerciseService.deleteExercise(id);
			res.status(204).send();
		} catch (error) {
			logger.error("Error deleting exercise:", error);
			res.status(500).json({
				error: "Failed to delete exercise",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},

	upsertExercisesToWorkout: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({ errors: errors.array() });
			}

			const { workoutId, exercises, supersets } = req.body;

			const result = await exerciseService.upsertExercisesToWorkout(
				workoutId,
				exercises,
				supersets
			);

			res.status(200).json({
				message: "Exercises and supersets upserted to workout successfully",
				count: result.length,
				data: result,
			});
		} catch (error) {
			logger.error("Error upserting exercises to workout:", error);
			res.status(500).json({
				error: "Failed to upsert exercises to workout",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
};
