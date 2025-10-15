import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { beginnerProgramController, beginnerProgramValidators } from "../controllers/beginnerProgramController";

const router = Router();

/**
 * POST /api/v2/beginner/questionnaire
 * Submit questionnaire responses and get recommended program templates
 * Requires authentication - processes user data to suggest appropriate beginner programs
 */
router.post(
  "/api/v2/beginner/questionnaire",
  authenticateToken,
  beginnerProgramValidators.questionnaire,
  beginnerProgramController.submitQuestionnaire
);

/**
 * POST /api/v2/beginner/create-program
 * Create a beginner program from template with personalized starting weights
 * Requires authentication - creates complete program with calculated weights based on age/gender
 */
router.post(
  "/api/v2/beginner/create-program",
  authenticateToken,
  beginnerProgramValidators.createProgram,
  beginnerProgramController.createProgram
);

export default router;