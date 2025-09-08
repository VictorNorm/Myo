import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { templateController, templateValidators } from "../controllers/templateController";

const router = Router();

/**
 * GET /workouts/:workoutId/template
 * Get workout template with exercise data based on program type
 * - For AUTOMATED programs: Uses exercise baselines
 * - For MANUAL programs: Uses last completed exercise data
 */
router.get(
	"/workouts/:workoutId/template",
	authenticateToken,
	templateValidators.getWorkoutTemplate,
	templateController.getWorkoutTemplate
);

/**
 * V2 alias: GET /api/v2/workouts/:workoutId/template
 * Provides /api/v2/ prefixed path for frontend compatibility
 */
router.get(
	"/api/v2/workouts/:workoutId/template",
	authenticateToken,
	templateValidators.getWorkoutTemplate,
	templateController.getWorkoutTemplate
);

export default router;