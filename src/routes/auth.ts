import { Router } from "express";
import { authController, authValidators } from "../controllers/authController";
import authenticateToken from "../middleware/authenticateToken";
import signupLimiter from "../middleware/signupLimiter";

const router = Router();

// V2 Routes only

// POST /api/v2/signup - Register new user
router.post(
	"/api/v2/signup",
	signupLimiter,
	authValidators.signup,
	authController.signup
);

// POST /api/v2/login - Authenticate user
router.post(
	"/api/v2/login",
	authValidators.login,
	authController.login
);

// GET /api/v2/verify-email - Verify email address
router.get(
	"/api/v2/verify-email",
	authController.verifyEmail
);

// Protected routes
router.get(
	"/protectedRouted",
	authenticateToken,
	authController.testProtectedRoute
);

router.get(
	"/verificationSuccessful",
	authenticateToken,
	authController.verificationSuccessful
);

export default router;
