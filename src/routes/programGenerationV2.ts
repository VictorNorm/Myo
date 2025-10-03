import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { 
  programGenerationController, 
  programGenerationValidators 
} from "../controllers/programGenerationController";

const router = Router();

/**
 * POST /api/v2/programs/generate
 * Generate and create a new program based on user preferences
 * Creates program with workouts and activates it
 * Requires authentication
 */
router.post(
  "/api/v2/programs/generate",
  authenticateToken,
  programGenerationValidators.generateProgram,
  programGenerationController.generateProgram
);

/**
 * POST /api/v2/programs/preview
 * Preview a program without creating it in the database
 * Returns program structure based on preferences
 * No authentication required for preview
 */
router.post(
  "/api/v2/programs/preview",
  programGenerationValidators.previewProgram,
  programGenerationController.previewProgram
);

/**
 * POST /api/v2/programs/quick-setup
 * Generate a program using recommended defaults for experience level
 * Quick setup for beginners with preset values
 * Requires authentication
 */
router.post(
  "/api/v2/programs/quick-setup",
  authenticateToken,
  programGenerationValidators.quickSetup,
  programGenerationController.quickSetup
);

/**
 * GET /api/v2/programs/recommended-preferences/:experience
 * Get recommended preferences for a given experience level
 * Helps users understand what values to choose
 * No authentication required
 */
router.get(
  "/api/v2/programs/recommended-preferences/:experience",
  programGenerationController.getRecommendedPreferences
);

export default router;