import { Router } from "express";
import { workoutController, workoutValidators } from "../controllers/workoutController";
import authenticateToken from "../middleware/authenticateToken";

const router = Router();

// Apply authentication middleware to all workout routes
router.use("/api/v2/workouts", authenticateToken);

// V2 Routes

// GET /api/v2/workouts/:workoutId/exercises - Get exercises for a specific workout with completion data
router.get(
  "/api/v2/workouts/:workoutId/exercises",
  workoutValidators.workoutExercises,
  workoutController.getWorkoutExercises
);

// POST /api/v2/workouts/completeWorkout - Complete a full workout (multiple exercises)
router.post(
  "/api/v2/workouts/completeWorkout",
  workoutValidators.completeWorkout,
  workoutController.completeWorkout
);

// POST /api/v2/workouts/rate-exercise - Rate individual exercise and calculate progression
router.post(
  "/api/v2/workouts/rate-exercise",
  workoutValidators.rateExercise,
  workoutController.rateExercise
);

// POST /api/v2/workouts/addworkout - Add new workout to program
router.post(
  "/api/v2/workouts/addworkout",
  workoutValidators.addWorkout,
  workoutController.addWorkout
);

export default router;