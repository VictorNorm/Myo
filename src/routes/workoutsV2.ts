import { Router } from "express";
import { workoutController, workoutValidators } from "../controllers/workoutController";
import authenticateToken from "../middleware/authenticateToken";

const router = Router();

// Apply authentication middleware to all workout routes
router.use("/api/v2/workouts", authenticateToken);
router.use("/programs/:programId/workouts", authenticateToken);

// Routes for workouts V2 - following layered architecture pattern

// Get workouts for a specific program
router.get(
  "/programs/:programId/workouts",
  workoutValidators.programWorkouts,
  workoutController.getProgramWorkouts
);

// Get exercises for a specific workout with completion data
router.get(
  "/api/v2/workouts/:workoutId/exercises",
  workoutValidators.workoutExercises,
  workoutController.getWorkoutExercises
);

// Complete a full workout (multiple exercises)
router.post(
  "/api/v2/workouts/completeWorkout",
  workoutValidators.completeWorkout,
  workoutController.completeWorkout
);

// Rate individual exercise and calculate progression
router.post(
  "/api/v2/workouts/rate-exercise",
  workoutValidators.rateExercise,
  workoutController.rateExercise
);

// Add new workout to program
router.post(
  "/api/v2/workouts/addworkout",
  workoutValidators.addWorkout,
  workoutController.addWorkout
);


export default router;