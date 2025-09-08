import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import authorizeMiddleware from "../middleware/authorizeMiddleware";
import { statsController, statsValidators } from "../controllers/statsController";

const router = Router();

/**
 * GET /progression/programs/:programId/exercises
 * Get progression history for all exercises in a specific program
 * Returns baseline data, progression history, and last completed exercise for each exercise
 */
router.get(
	"/progression/programs/:programId/exercises",
	authenticateToken,
	authorizeMiddleware.programAccess,
	statsValidators.getExerciseProgression,
	statsController.getExerciseProgression
);

/**
 * GET /completed-exercises/programs/:programId
 * Calculate volume data and trends for completed exercises
 * Supports time frame filtering: week, month, program, all
 * Returns volume by date, muscle group, exercise, and weekly trends
 */
router.get(
	"/completed-exercises/programs/:programId",
	authenticateToken,
	authorizeMiddleware.programAccess,
	statsValidators.getCompletedExercises,
	statsController.getCompletedExercises
);

/**
 * GET /workout-progress/programs/:programId
 * Calculate workout frequency, streaks, and consistency metrics
 * Supports time frame filtering: week, month, program, all
 * Returns current streak, longest streak, weekly frequency, and consistency percentage
 */
router.get(
	"/workout-progress/programs/:programId",
	authenticateToken,
	authorizeMiddleware.programAccess,
	statsValidators.getWorkoutProgress,
	statsController.getWorkoutProgress
);

/**
 * GET /programs/:programId/statistics
 * Comprehensive program statistics including strength gains and completion metrics
 * Returns program info, completion percentage, strength gains, and volume calculations
 */
router.get(
	"/programs/:programId/statistics",
	authenticateToken,
	authorizeMiddleware.programAccess,
	statsValidators.getProgramStatistics,
	statsController.getProgramStatistics
);

// V2 Route aliases for frontend compatibility
// These provide /api/v2/ prefixed paths that point to the same handlers

/**
 * V2 alias: GET /api/v2/progression/programs/:programId/exercises
 */
router.get(
	"/api/v2/progression/programs/:programId/exercises",
	authenticateToken,
	authorizeMiddleware.programAccess,
	statsValidators.getExerciseProgression,
	statsController.getExerciseProgression
);

/**
 * V2 alias: GET /api/v2/completed-exercises/programs/:programId
 */
router.get(
	"/api/v2/completed-exercises/programs/:programId",
	authenticateToken,
	authorizeMiddleware.programAccess,
	statsValidators.getCompletedExercises,
	statsController.getCompletedExercises
);

/**
 * V2 alias: GET /api/v2/workout-progress/programs/:programId
 */
router.get(
	"/api/v2/workout-progress/programs/:programId",
	authenticateToken,
	authorizeMiddleware.programAccess,
	statsValidators.getWorkoutProgress,
	statsController.getWorkoutProgress
);

/**
 * V2 alias: GET /api/v2/programs/:programId/statistics
 */
router.get(
	"/api/v2/programs/:programId/statistics",
	authenticateToken,
	authorizeMiddleware.programAccess,
	statsValidators.getProgramStatistics,
	statsController.getProgramStatistics
);

export default router;