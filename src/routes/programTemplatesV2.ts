import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { programTemplateController, programTemplateValidators } from "../controllers/programTemplateController";

const router = Router();

/**
 * GET /api/v2/templates
 * Public endpoint to retrieve all available program templates
 * Supports filtering by category, difficulty, goal, frequency, and program type
 */
router.get(
  "/api/v2/templates",
  programTemplateValidators.getTemplates,
  programTemplateController.getTemplates
);

/**
 * GET /api/v2/templates/:id
 * Public endpoint to retrieve specific template with full details
 * Includes all workouts and exercises within the template
 */
router.get(
  "/api/v2/templates/:id",
  programTemplateValidators.getTemplateById,
  programTemplateController.getTemplateById
);

/**
 * POST /api/v2/templates/:id/create-program
 * Create a new user program based on a template
 * Requires authentication - converts template structure into actual user program
 */
router.post(
  "/api/v2/templates/:id/create-program",
  authenticateToken,
  programTemplateValidators.createProgramFromTemplate,
  programTemplateController.createProgramFromTemplate
);

/**
 * POST /api/v2/templates
 * Admin endpoint to create new program template
 * Requires admin privileges and full template structure including workouts and exercises
 */
router.post(
  "/api/v2/templates",
  authenticateToken,
  programTemplateValidators.createTemplate,
  programTemplateController.createTemplate
);

/**
 * PUT /api/v2/templates/:id
 * Admin endpoint to update existing program template
 * Requires admin privileges - allows partial updates to template metadata
 */
router.put(
  "/api/v2/templates/:id",
  authenticateToken,
  programTemplateValidators.updateTemplate,
  programTemplateController.updateTemplate
);

/**
 * DELETE /api/v2/templates/:id
 * Admin endpoint to deactivate program template (soft delete)
 * Requires admin privileges - sets is_active to false rather than hard delete
 */
router.delete(
  "/api/v2/templates/:id",
  authenticateToken,
  programTemplateValidators.deleteTemplate,
  programTemplateController.deleteTemplate
);

export default router;