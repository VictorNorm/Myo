import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import { muscleGroupController, muscleGroupValidators } from "../controllers/muscleGroupController";

const router = Router();

// Apply authentication middleware to all muscle group routes
router.use("/api/v2/muscle-groups", authenticateToken);

// GET /api/v2/muscle-groups - Get all muscle groups
router.get(
	"/api/v2/muscle-groups", 
	muscleGroupController.getAllMuscleGroups
);

// GET /api/v2/muscle-groups/:id - Get muscle group by ID
router.get(
	"/api/v2/muscle-groups/:id",
	muscleGroupValidators.getById,
	muscleGroupController.getMuscleGroupById
);

// POST /api/v2/muscle-groups - Create new muscle group
router.post(
	"/api/v2/muscle-groups",
	muscleGroupValidators.create,
	muscleGroupController.createMuscleGroup
);

// PUT /api/v2/muscle-groups/:id - Update muscle group
router.put(
	"/api/v2/muscle-groups/:id",
	muscleGroupValidators.update,
	muscleGroupController.updateMuscleGroup
);

// DELETE /api/v2/muscle-groups/:id - Delete muscle group
router.delete(
	"/api/v2/muscle-groups/:id",
	muscleGroupValidators.deleteById,
	muscleGroupController.deleteMuscleGroup
);

export default router;