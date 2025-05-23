import type { Request, Response } from "express";
import { exerciseService } from "../services/exerciseService";
import { body, validationResult } from "express-validator";

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
};

export const exerciseController = {
	getAllExercises: async (req: Request, res: Response) => {
		try {
			const exercises = await exerciseService.getAllExercises();
			res.status(200).json(exercises);
		} catch (error) {
			console.error("Error fetching exercises:", error);
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
			console.error("Error fetching exercise:", error);
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
			console.error("Error creating exercise:", error);
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
			console.error("Error updating exercise:", error);
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
			console.error("Error deleting exercise:", error);
			res.status(500).json({
				error: "Failed to delete exercise",
				details: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
};
