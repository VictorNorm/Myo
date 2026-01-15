import { Router } from "express";
import authenticateToken from "../middleware/authenticateToken";
import authorizeMiddleware from "../middleware/authorizeMiddleware";
import {
	statsController,
	statsValidators,
	crossProgramController,
	crossProgramValidators,
} from "../controllers/statsController";

const router = Router();





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

// =====================================================
// CROSS-PROGRAM ROUTES (All Programs Stats)
// =====================================================

/**
 * GET /api/v2/stats/all-programs/progression
 * Get exercise progression across ALL user programs
 */
router.get(
	"/api/v2/stats/all-programs/progression",
	authenticateToken,
	crossProgramValidators.getExerciseProgressionAllPrograms,
	crossProgramController.getExerciseProgressionAllPrograms
);

/**
 * GET /api/v2/stats/all-programs/volume
 * Get volume data across ALL user programs
 */
router.get(
	"/api/v2/stats/all-programs/volume",
	authenticateToken,
	crossProgramValidators.getVolumeAllPrograms,
	crossProgramController.getVolumeAllPrograms
);

/**
 * GET /api/v2/stats/all-programs/frequency
 * Get workout frequency across ALL user programs
 */
router.get(
	"/api/v2/stats/all-programs/frequency",
	authenticateToken,
	crossProgramValidators.getFrequencyAllPrograms,
	crossProgramController.getFrequencyAllPrograms
);

/**
 * GET /api/v2/stats/all-programs/exercises
 * Get all unique exercises the user has ever completed
 */
router.get(
	"/api/v2/stats/all-programs/exercises",
	authenticateToken,
	crossProgramValidators.getAllUserExercises,
	crossProgramController.getAllUserExercises
);

export default router;