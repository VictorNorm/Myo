import type { Request, Response } from "express";
import { body, param, validationResult } from "express-validator";
import { workoutService, type ExerciseCompletionData, type ExerciseRatingData } from "../services/workoutService";
import type { AuthenticatedUser } from "../../types/types";
import logger from "../services/logger";

// Custom interfaces for typed requests  
interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

interface ExerciseCompletionRequest extends AuthenticatedRequest {
  body: ExerciseCompletionData[];
}

interface ExerciseRatingRequest extends AuthenticatedRequest {
  body: ExerciseRatingData;
}

interface AddWorkoutRequest extends AuthenticatedRequest {
  body: {
    name: string;
    programId: number;
  };
}

export const workoutValidators = {
  programWorkouts: [
    param("programId")
      .isInt({ min: 1 })
      .withMessage("Program ID must be a positive integer"),
  ],

  workoutExercises: [
    param("workoutId")
      .isInt({ min: 1 })
      .withMessage("Workout ID must be a positive integer"),
  ],

  completeWorkout: [
    body()
      .isArray({ min: 1 })
      .withMessage("Request body must be a non-empty array"),
    body("*.userId")
      .isInt({ min: 1 })
      .withMessage("User ID must be a positive integer"),
    body("*.workoutId")
      .isInt({ min: 1 })
      .withMessage("Workout ID must be a positive integer"),
    body("*.exerciseId")
      .isInt({ min: 1 })
      .withMessage("Exercise ID must be a positive integer"),
    body("*.sets")
      .isInt({ min: 1, max: 20 })
      .withMessage("Sets must be between 1 and 20"),
    body("*.reps")
      .isInt({ min: 1, max: 100 })
      .withMessage("Reps must be between 1 and 100"),
    body("*.weight")
      .isFloat({ min: 0 })
      .withMessage("Weight must be a non-negative number"),
    body("*.rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("*.useAdaptiveIncrements")
      .optional()
      .isBoolean()
      .withMessage("useAdaptiveIncrements must be boolean"),
    body("*.programGoal")
      .optional()
      .isIn(["STRENGTH", "HYPERTROPHY"])
      .withMessage("Program goal must be STRENGTH or HYPERTROPHY"),
  ],

  rateExercise: [
    body("exerciseId")
      .isInt({ min: 1 })
      .withMessage("Exercise ID must be a positive integer"),
    body("workoutId")
      .isInt({ min: 1 })
      .withMessage("Workout ID must be a positive integer"),
    body("sets")
      .isInt({ min: 1, max: 20 })
      .withMessage("Sets must be between 1 and 20"),
    body("reps")
      .isInt({ min: 1, max: 100 })
      .withMessage("Reps must be between 1 and 100"),
    body("weight")
      .isFloat({ min: 0 })
      .withMessage("Weight must be a non-negative number"),
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("equipment_type")
      .isIn(["DUMBBELL", "BARBELL", "CABLE", "MACHINE", "BODYWEIGHT"])
      .withMessage("Invalid equipment type"),
    body("is_compound")
      .isBoolean()
      .withMessage("is_compound must be boolean"),
    body("useAdaptiveIncrements")
      .optional()
      .isBoolean()
      .withMessage("useAdaptiveIncrements must be boolean"),
  ],

  addWorkout: [
    body("name")
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage("Workout name must be between 1 and 100 characters"),
    body("programId")
      .isInt({ min: 1 })
      .withMessage("Program ID must be a positive integer"),
  ],
};

export const workoutController = {
  // GET /programs/:programId/workouts
  getProgramWorkouts: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        logger.warn("Attempted to access workouts without authentication");
        return res.status(401).json({ error: "User not authenticated" });
      }

      const programId = Number(req.params.programId);
      const isAdmin = req.user.role === "ADMIN";

      const workouts = await workoutService.getProgramWorkouts(
        programId,
        req.user.id,
        isAdmin
      );

      logger.debug("Fetched workouts for program", {
        programId,
        userId: req.user.id,
        workoutCount: workouts.length,
      });

      res.status(200).json(workouts);
    } catch (error) {
      logger.error(
        `Error fetching program workouts: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          stack: error instanceof Error ? error.stack : undefined,
          programId: req.params.programId,
          userId: req.user?.id,
        }
      );

      if (error instanceof Error) {
        if (error.message === "Program not found") {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === "Not authorized to access this program's workouts") {
          return res.status(403).json({ error: error.message });
        }
      }

      res.status(500).json({ error: "Internal server error" });
    }
  },

  // GET /workouts/:workoutId/exercises
  getWorkoutExercises: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        logger.warn("Attempted to access workout exercises without authentication");
        return res.status(401).json({ error: "User not authenticated" });
      }

      const workoutId = Number(req.params.workoutId);

      const exercises = await workoutService.getWorkoutExercises(workoutId, req.user.id);

      logger.debug("Successfully fetched workout exercises", {
        workoutId,
        userId: req.user.id,
        exerciseCount: exercises.length,
      });

      res.status(200).json(exercises);
    } catch (error) {
      logger.error(
        `Error fetching workout exercises: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          stack: error instanceof Error ? error.stack : undefined,
          workoutId: req.params.workoutId,
          userId: req.user?.id,
        }
      );

      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // POST /workouts/completeWorkout
  completeWorkout: async (req: ExerciseCompletionRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        logger.warn("Attempted to complete workout without authentication");
        return res.status(401).json({ error: "User not authenticated" });
      }

      const exerciseData = req.body;

      // Verify all exercises belong to the authenticated user
      const invalidData = exerciseData.find(data => data.userId !== req.user!.id);
      if (invalidData) {
        logger.warn("User attempted to complete workout for different user", {
          authenticatedUserId: req.user.id,
          requestedUserId: invalidData.userId,
        });
        return res.status(403).json({ error: "Cannot complete workout for another user" });
      }

      const result = await workoutService.completeWorkout(exerciseData);

      logger.info("Workout completed successfully", {
        workoutId: exerciseData[0].workoutId,
        userId: req.user.id,
        exerciseCount: exerciseData.length,
        programType: result.programType,
      });

      res.status(201).json(result);
    } catch (error) {
      logger.error(
        `Error completing workout: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          stack: error instanceof Error ? error.stack : undefined,
          userId: req.user?.id,
          workoutId: req.body?.[0]?.workoutId,
          exerciseCount: req.body?.length,
        }
      );

      res.status(500).json({
        error: "An error occurred while saving the exercise data.",
        message: error instanceof Error ? error.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" && error instanceof Error
          ? error.stack
          : undefined,
      });
    }
  },

  // POST /workouts/rate-exercise
  rateExercise: async (req: ExerciseRatingRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        logger.warn("Unauthorized attempt to rate exercise");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const userId = typeof req.user.id === "string" 
        ? Number.parseInt(req.user.id, 10) 
        : req.user.id;

      const exerciseData = {
        ...req.body,
        useAdaptiveIncrements: req.body.useAdaptiveIncrements ?? true, // Default to true
      };

      logger.debug("Processing exercise rating", {
        userId,
        exerciseId: exerciseData.exerciseId,
        workoutId: exerciseData.workoutId,
        rating: exerciseData.rating,
        useAdaptiveIncrements: exerciseData.useAdaptiveIncrements,
      });

      const result = await workoutService.rateExercise(userId, exerciseData);

      res.json(result);
    } catch (error) {
      logger.error(
        `Error rating exercise: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          stack: error instanceof Error ? error.stack : undefined,
          userId: req.user?.id,
          exerciseId: req.body?.exerciseId,
          workoutId: req.body?.workoutId,
        }
      );

      if (error instanceof Error) {
        if (error.message === "Exercise not found" || error.message === "Workout not found or not associated with a program") {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === "Failed to record exercise completion") {
          return res.status(500).json({ error: error.message });
        }
      }

      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },

  // POST /workouts/addworkout
  addWorkout: async (req: AddWorkoutRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.user) {
        logger.warn("Unauthorized attempt to add workout");
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { name, programId } = req.body;

      const result = await workoutService.addWorkout(
        name,
        programId,
        req.user.id,
        req.user.role
      );

      res.status(201).json(result);
    } catch (error) {
      logger.error(
        `Error adding workout: ${error instanceof Error ? error.message : "Unknown error"}`,
        {
          stack: error instanceof Error ? error.stack : undefined,
          workoutName: req.body?.name,
          programId: req.body?.programId,
          userId: req.user?.id,
        }
      );

      if (error instanceof Error) {
        if (error.message === "Program does not exist") {
          return res.status(404).json({ error: error.message });
        }
        if (error.message === "Not authorized to add workouts to this program") {
          return res.status(403).json({ error: error.message });
        }
      }

      res.status(500).json({ 
        error: "An error occurred while adding the workout.",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
};