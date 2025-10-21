import type { Request, Response } from "express";
import { body, param, query, validationResult } from "express-validator";
import { programService } from "../services/programService";
import logger from "../services/logger";

// Validation rules
export const programValidators = {
	getUserPrograms: [
		query("status")
			.optional()
			.isIn(["PENDING", "ACTIVE", "COMPLETED", "ARCHIVED"])
			.withMessage("Invalid status value"),
	],

	getUserProgramsById: [
		param("userId")
			.isInt({ min: 1 })
			.withMessage("User ID must be a positive integer"),
		query("status")
			.optional()
			.isIn(["PENDING", "ACTIVE", "COMPLETED", "ARCHIVED"])
			.withMessage("Invalid status value"),
	],

	getNextWorkout: [
		param("programId")
			.isInt({ min: 1 })
			.withMessage("Program ID must be a positive integer"),
	],

	updateProgramStatus: [
		param("programId")
			.isInt({ min: 1 })
			.withMessage("Program ID must be a positive integer"),
		body("status")
			.isIn(["PENDING", "ACTIVE", "COMPLETED", "ARCHIVED"])
			.withMessage("Invalid status value"),
		body("endDate")
			.optional()
			.isISO8601()
			.withMessage("End date must be a valid ISO 8601 date"),
	],

	createProgram: [
		body("name")
			.isString()
			.trim()
			.isLength({ min: 1, max: 255 })
			.withMessage("Program name must be a non-empty string (max 255 characters)"),
		body("goal")
			.isIn(["HYPERTROPHY", "STRENGTH"])
			.withMessage("Goal must be either HYPERTROPHY or STRENGTH"),
		body("programType")
			.isIn(["MANUAL", "AUTOMATED"])
			.withMessage("Program type must be either MANUAL or AUTOMATED"),
		body("startDate")
			.isISO8601()
			.withMessage("Start date must be a valid ISO 8601 date"),
		body("endDate")
			.optional()
			.isISO8601()
			.withMessage("End date must be a valid ISO 8601 date"),
		body("weeklyFrequency")
			.isInt({ min: 1, max: 7 })
			.withMessage("Weekly frequency is required and must be between 1 and 7"),
	],

	createProgramWithWorkouts: [
		body("name")
			.isString()
			.trim()
			.isLength({ min: 1, max: 255 })
			.withMessage("Program name must be a non-empty string (max 255 characters)"),
		body("goal")
			.isIn(["HYPERTROPHY", "STRENGTH"])
			.withMessage("Goal must be either HYPERTROPHY or STRENGTH"),
		body("programType")
			.isIn(["MANUAL", "AUTOMATED"])
			.withMessage("Program type must be either MANUAL or AUTOMATED"),
		body("startDate")
			.isISO8601()
			.withMessage("Start date must be a valid ISO 8601 date"),
		body("endDate")
			.optional()
			.isISO8601()
			.withMessage("End date must be a valid ISO 8601 date"),
		body("workouts")
			.isArray({ min: 1 })
			.withMessage("At least one workout is required"),
		body("workouts.*.name")
			.isString()
			.trim()
			.isLength({ min: 1, max: 255 })
			.withMessage("Each workout must have a non-empty name (max 255 characters)"),
		body("weeklyFrequency")
			.isInt({ min: 1, max: 7 })
			.withMessage("Weekly frequency is required and must be between 1 and 7"),
		// Optional nested exercises in workouts
		body("workouts.*.exercises")
			.optional()
			.isArray()
			.withMessage("Exercises must be an array if provided"),
		body("workouts.*.exercises.*.exerciseId")
			.optional()
			.isInt({ min: 1 })
			.withMessage("Exercise ID must be a positive integer"),
		body("workouts.*.exercises.*.sets")
			.optional()
			.isInt({ min: 1, max: 20 })
			.withMessage("Sets must be between 1 and 20"),
		body("workouts.*.exercises.*.reps")
			.optional()
			.isInt({ min: 1, max: 100 })
			.withMessage("Reps must be between 1 and 100"),
		body("workouts.*.exercises.*.weight")
			.optional()
			.isFloat({ min: 0 })
			.withMessage("Weight must be non-negative"),
		body("workouts.*.exercises.*.order")
			.optional()
			.isInt({ min: 1 })
			.withMessage("Order must be a positive integer"),
		// Optional baselines
		body("baselines")
			.optional()
			.isArray()
			.withMessage("Baselines must be an array if provided"),
		body("baselines.*.exerciseId")
			.optional()
			.isInt({ min: 1 })
			.withMessage("Baseline exercise ID must be a positive integer"),
		body("baselines.*.sets")
			.optional()
			.isInt({ min: 1, max: 20 })
			.withMessage("Baseline sets must be between 1 and 20"),
		body("baselines.*.reps")
			.optional()
			.isInt({ min: 1, max: 100 })
			.withMessage("Baseline reps must be between 1 and 100"),
		body("baselines.*.weight")
			.optional()
			.isFloat({ min: 0 })
			.withMessage("Baseline weight must be non-negative"),
		body("shouldActivate")
			.optional()
			.isBoolean()
			.withMessage("shouldActivate must be a boolean"),
		body("targetUserId")
			.optional()
			.isInt({ min: 1 })
			.withMessage("Target user ID must be a positive integer"),
	],

	deleteProgram: [
		param("programId")
			.isInt({ min: 1 })
			.withMessage("Program ID must be a positive integer"),
	],
};

export const programController = {
	// GET /programs - Get user's programs with status filtering
	getUserPrograms: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({
					errors: errors.array(),
					message: "Validation failed"
				});
			}

			if (!req.user?.id) {
				logger.warn("Attempted to fetch programs with no user in request");
				return res.status(401).json({
					error: "Authentication required",
					message: "User not authenticated"
				});
			}

			const userId = req.user.id;
			const status = req.query.status as any;

			const result = await programService.getUserPrograms(userId, status);

			return res.status(200).json(result);

		} catch (error) {
			logger.error(
				`Error fetching programs: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					userId: req.user?.id,
					statusFilter: req.query.status,
				}
			);
			return res.status(500).json({ 
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error"
			});
		}
	},

	// GET /programs/:userId - Get programs for specific user
	getUserProgramsById: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json({
					errors: errors.array(),
					message: "Validation failed"
				});
			}

			const userId = Number(req.params.userId);
			const status = req.query.status as any;

			const programs = await programService.getUserProgramsSimple(userId, status);

			return res.status(200).json({ programs });

		} catch (error) {
			logger.error(
				`Error fetching programs for user: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					userId: req.params.userId,
					statusFilter: req.query.status,
				}
			);

			if (error instanceof Error && error.message.includes("No programs")) {
				return res.status(404).json({
					error: "Not found",
					message: error.message
				});
			}

			return res.status(500).json({ 
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error"
			});
		}
	},

	// GET /programs/:programId/nextWorkout - Get next workout in program
	getNextWorkout: async (req: Request, res: Response) => {
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

			const programId = Number(req.params.programId);
			const userId = req.user.id;

			const result = await programService.getNextWorkout(programId, userId);

			// Return in old format - spread workout data at top level
			if (!result.nextWorkout) {
				return res.status(404).json({ error: "No workouts found for this program" });
			}

			return res.status(200).json({
				...result.nextWorkout,
				workout_progress: result.workout_progress,
				isNewCycle: result.isNewCycle,
			});

		} catch (error) {
			logger.error(
				`Error fetching next workout: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId: req.params.programId,
					userId: req.user?.id,
				}
			);

			if (error instanceof Error && 
				(error.message.includes("not found") || error.message.includes("access denied"))) {
				return res.status(404).json({
					error: "Not found",
					message: "Program not found or access denied"
				});
			}

			return res.status(500).json({ 
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error"
			});
		}
	},

	// PATCH /programs/:programId/status - Update program status
	updateProgramStatus: async (req: Request, res: Response) => {
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

			const programId = Number(req.params.programId);
			const userId = req.user.id;
			const { status, endDate } = req.body;

			const updatedProgram = await programService.updateProgramStatus(
				programId,
				userId,
				{ status, endDate }
			);

			return res.status(200).json({
				data: updatedProgram,
				message: "Program status updated successfully"
			});

		} catch (error) {
			logger.error(
				`Error updating program status: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId: req.params.programId,
					userId: req.user?.id,
					requestedStatus: req.body.status,
				}
			);

			if (error instanceof Error) {
				if (error.message.includes("not found") || error.message.includes("access denied")) {
					return res.status(404).json({
						error: "Not found",
						message: "Program not found or access denied"
					});
				}

				if (error.message.includes("Invalid status transition")) {
					return res.status(400).json({
						error: "Invalid transition",
						message: error.message
					});
				}
			}

			return res.status(500).json({ 
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error"
			});
		}
	},

	// GET /allprograms - Get all programs (admin endpoint)
	getAllPrograms: async (req: Request, res: Response) => {
		try {
			if (!req.user?.id) {
				return res.status(401).json({
					error: "Authentication required",
					message: "User not authenticated"
				});
			}

			const programs = await programService.getAllPrograms();

			return res.status(200).json({ programs });

		} catch (error) {
			logger.error(
				`Error fetching all programs: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					userId: req.user?.id,
				}
			);
			return res.status(500).json({ 
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error"
			});
		}
	},

	// POST /programs - Create basic program
	createProgram: async (req: Request, res: Response) => {
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
			const { name, goal, programType, startDate, endDate } = req.body;

			const program = await programService.createProgram({
				name,
				userId,
				goal,
				programType,
				startDate,
				endDate,
			});

			return res.status(201).json({
				data: program,
				message: "Program created successfully"
			});

		} catch (error) {
			logger.error(
				`Error creating program: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					userId: req.user?.id,
					programName: req.body.name,
				}
			);
			return res.status(500).json({ 
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error"
			});
		}
	},

	// POST /programs/create-with-workouts - Create program with workouts
	createProgramWithWorkouts: async (req: Request, res: Response) => {
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

			const requestingUserId = req.user.id;
			const isAdmin = req.user.role === "ADMIN"; // Assuming role is available in user

			const program = await programService.createProgramWithWorkouts(
				requestingUserId,
				isAdmin,
				req.body
			);

			return res.status(201).json({
				data: program,
				message: "Program with workouts created successfully"
			});

		} catch (error) {
			logger.error(
				`Error creating program with workouts: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					requestingUserId: req.user?.id,
					programName: req.body.name,
					workoutCount: req.body.workouts?.length,
				}
			);

			if (error instanceof Error && error.message.includes("Access denied")) {
				return res.status(403).json({
					error: "Access denied",
					message: error.message
				});
			}

			if (error instanceof Error && 
				(error.message.includes("workout") || error.message.includes("required"))) {
				return res.status(400).json({
					error: "Validation error",
					message: error.message
				});
			}

			return res.status(500).json({ 
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error"
			});
		}
	},

	// DELETE /programs/:programId - Delete program
	deleteProgram: async (req: Request, res: Response) => {
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

			const programId = Number(req.params.programId);
			const userId = req.user.id;

			await programService.deleteProgram(programId, userId);

			return res.status(200).json({
				message: "Program deleted successfully"
			});

		} catch (error) {
			logger.error(
				`Error deleting program: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId: req.params.programId,
					userId: req.user?.id,
				}
			);

			if (error instanceof Error) {
				if (error.message.includes("not found") || error.message.includes("access denied")) {
					return res.status(404).json({
						error: "Not found",
						message: "Program not found or access denied"
					});
				}

				if (error.message.includes("archived")) {
					return res.status(400).json({
						error: "Invalid state",
						message: error.message
					});
				}
			}

			return res.status(500).json({ 
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error"
			});
		}
	},
};