import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import authorizeMiddleware from "../middleware/authorizeMiddleware";
import { programController, programValidators } from "../controllers/programController";
import { workoutController, workoutValidators } from "../controllers/workoutController";
import { exerciseController, exerciseValidators } from "../controllers/exerciseController";

const router = Router();

// V2 Route aliases for frontend compatibility
// These provide /api/v2/ prefixed paths that point to the same handlers

/**
 * V2 alias: GET /api/v2/programs
 */
router.get(
	"/api/v2/programs",
	authenticateToken,
	programValidators.getUserPrograms,
	programController.getUserPrograms
);

/**
 * V2: GET /api/v2/programs/single/:programId
 * Get a single program by its ID
 */
router.get(
	"/api/v2/programs/single/:programId",
	authenticateToken,
	authorizeMiddleware.programAccess,
	programValidators.getProgramById,
	programController.getProgramById
);

/**
 * V2 alias: GET /api/v2/programs/:userId
 */
router.get(
	"/api/v2/programs/:userId",
	authenticateToken,
	programValidators.getUserProgramsById,
	programController.getUserProgramsById
);

/**
 * V2 alias: GET /api/v2/programs/:programId/nextWorkout
 */
router.get(
	"/api/v2/programs/:programId/nextWorkout",
	authenticateToken,
	programValidators.getNextWorkout,
	programController.getNextWorkout
);

/**
 * V2 alias: PATCH /api/v2/programs/:programId/status
 */
router.patch(
	"/api/v2/programs/:programId/status",
	authenticateToken,
	authorizeMiddleware.programAccess,
	programValidators.updateProgramStatus,
	programController.updateProgramStatus
);

/**
 * V2 alias: POST /api/v2/programs
 */
router.post(
	"/api/v2/programs",
	authenticateToken,
	programValidators.createProgram,
	programController.createProgram
);

/**
 * V2 alias: POST /api/v2/programs/create-with-workouts
 */
router.post(
	"/api/v2/programs/create-with-workouts",
	authenticateToken,
	programValidators.createProgramWithWorkouts,
	programController.createProgramWithWorkouts
);

/**
 * V2 alias: GET /api/v2/allprograms
 * Admin endpoint to get all programs across all users
 */
router.get(
	"/api/v2/allprograms",
	authenticateToken,
	programController.getAllPrograms
);

/**
 * V2 alias: DELETE /api/v2/programs/:programId
 */
router.delete(
	"/api/v2/programs/:programId",
	authenticateToken,
	programValidators.deleteProgram,
	programController.deleteProgram
);

/**
 * V2 alias: GET /api/v2/programs/:programId/workouts
 * Get workouts for a specific program
 */
router.get(
	"/api/v2/programs/:programId/workouts",
	authenticateToken,
	workoutValidators.programWorkouts,
	workoutController.getProgramWorkouts
);

/**
 * V2 alias: GET /api/v2/programs/:programId/exercises
 * Get all exercises used in a program's workouts
 */
router.get(
	"/api/v2/programs/:programId/exercises",
	authenticateToken,
	authorizeMiddleware.programAccess,
	exerciseValidators.getProgramExercises,
	exerciseController.getProgramExercises
);

export default router;