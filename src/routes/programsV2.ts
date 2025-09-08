import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import authorizeMiddleware from "../middleware/authorizeMiddleware";
import { programController, programValidators } from "../controllers/programController";
import { workoutController, workoutValidators } from "../controllers/workoutController";

const router = Router();

/**
 * GET /programs
 * Get user's programs with optional status filtering
 * Includes program counts by status and active program identification
 */
router.get(
	"/programs",
	authenticateToken,
	programValidators.getUserPrograms,
	programController.getUserPrograms
);

/**
 * GET /programs/:userId  
 * Get programs for specific user (simpler version for admin access)
 * Returns programs without counts and status aggregation
 */
router.get(
	"/programs/:userId",
	authenticateToken,
	programValidators.getUserProgramsById,
	programController.getUserProgramsById
);

/**
 * GET /programs/:programId/nextWorkout
 * Get the next workout in program sequence
 * Handles workout cycling and new cycle detection
 */
router.get(
	"/programs/:programId/nextWorkout",
	authenticateToken,
	programValidators.getNextWorkout,
	programController.getNextWorkout
);

/**
 * PATCH /programs/:programId/status
 * Update program status with validation and business rules
 * Validates status transitions and manages program activation
 */
router.patch(
	"/programs/:programId/status",
	authenticateToken,
	authorizeMiddleware.programAccess,
	programValidators.updateProgramStatus,
	programController.updateProgramStatus
);

/**
 * GET /allprograms
 * Admin endpoint to get all programs across all users
 */
router.get(
	"/allprograms",
	authenticateToken,
	programController.getAllPrograms
);

/**
 * POST /programs
 * Create a basic program without workouts
 */
router.post(
	"/programs",
	authenticateToken,
	programValidators.createProgram,
	programController.createProgram
);

/**
 * POST /programs/create-with-workouts
 * Create a program with associated workouts in a single transaction
 * Supports admin creation for other users and optional program activation
 */
router.post(
	"/programs/create-with-workouts",
	authenticateToken,
	programValidators.createProgramWithWorkouts,
	programController.createProgramWithWorkouts
);

/**
 * DELETE /programs/:programId
 * Delete a program and cascade delete all related data
 * Requires program to be archived before deletion
 */
router.delete(
	"/programs/:programId",
	authenticateToken,
	programValidators.deleteProgram,
	programController.deleteProgram
);

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

export default router;