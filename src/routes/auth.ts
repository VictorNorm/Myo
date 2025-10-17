import { Router } from "express";
import { authController, authValidators } from "../controllers/authController";
import authenticateToken from "../middleware/authenticateToken";
import signupLimiter from "../middleware/signupLimiter";

const router = Router();

// Public routes
router.post(
	"/signup",
	signupLimiter,
	authValidators.signup,
	authController.signup
);

router.post(
	"/api/v2/signup",
	signupLimiter,
	authValidators.signup,
	authController.signup
);

router.post(
	"/login",
	authValidators.login,
	authController.login
);

router.post(
	"/api/v2/login",
	authValidators.login,
	authController.login
);

router.get(
	"/verify-email",
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
