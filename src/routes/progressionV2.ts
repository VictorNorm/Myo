import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { progressionController, progressionValidators } from "../controllers/progressionController";

const router = Router();

// Apply authentication middleware to all progression routes
router.use("/api/v2/progression", authenticateToken);
router.use("/workouts", authenticateToken); // Backward compatibility

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

// Backward compatibility routes for existing frontend
// TODO: Remove these once frontend is updated to use V2 paths

// GET /workouts/:workoutId/exercises/:exerciseId/progression - Get progression for specific exercise (backward compatibility)
router.get(
	"/workouts/:workoutId/exercises/:exerciseId/progression",
	progressionValidators.getExerciseProgression,
	progressionController.getExerciseProgression
);

// GET /workouts/:workoutId/progression - Get progression for all exercises in workout (backward compatibility)
router.get(
	"/workouts/:workoutId/progression",
	progressionValidators.getWorkoutProgression,
	progressionController.getWorkoutProgression
);

export default router;