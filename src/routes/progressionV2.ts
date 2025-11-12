import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { progressionController, progressionValidators } from "../controllers/progressionController";

const router = Router();

// Apply authentication middleware to all progression routes
router.use("/api/v2/progression", authenticateToken);

// V2 Routes

// GET /api/v2/progression/workouts/:workoutId/exercises/:exerciseId - Get progression for specific exercise
router.get(
	"/api/v2/progression/workouts/:workoutId/exercises/:exerciseId",
	progressionValidators.getExerciseProgression,
	progressionController.getExerciseProgression
);

// GET /api/v2/progression/workouts/:workoutId - Get progression for all exercises in workout  
router.get(
	"/api/v2/progression/workouts/:workoutId",
	progressionValidators.getWorkoutProgression,
	progressionController.getWorkoutProgression
);

// GET /api/v2/progression/exercises/:exerciseId/programs/:programId/stats - Get progression statistics
router.get(
	"/api/v2/progression/exercises/:exerciseId/programs/:programId/stats",
	progressionValidators.getProgressionStats,
	progressionController.getProgressionStats
);

// GET /api/v2/progression/overview - Get user progression overview
router.get(
	"/api/v2/progression/overview",
	progressionController.getUserProgressionOverview
);


export default router;