import { Router } from "express";
import { exerciseController, exerciseValidators } from "../controllers/exerciseController";
import authenticateToken from "../middleware/authenticateToken";

const router = Router();

// Apply authentication middleware to all routes
router.use("/api/v2/exercises", authenticateToken);

// Routes for exercises
router.get("/api/v2/exercises", exerciseController.getAllExercises);
router.get("/api/v2/exercises/:id", exerciseController.getExerciseById);
router.post("/api/v2/exercises", exerciseValidators.create, exerciseController.createExercise);
router.put("/api/v2/exercises/:id", exerciseValidators.update, exerciseController.updateExercise);
router.delete("/api/v2/exercises/:id", exerciseController.deleteExercise);

export default router;