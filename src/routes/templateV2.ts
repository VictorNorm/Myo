import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { templateController, templateValidators } from "../controllers/templateController";

const router = Router();

// Apply authentication middleware to all template routes
router.use("/api/v2/workouts", authenticateToken);

// V2 Routes

// GET /api/v2/workouts/:workoutId/template - Get workout template with exercise data
router.get(
	"/api/v2/workouts/:workoutId/template",
	templateValidators.getWorkoutTemplate,
	templateController.getWorkoutTemplate
);

export default router;