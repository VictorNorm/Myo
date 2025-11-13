import { Router } from "express";
import { passwordController, passwordValidators } from "../controllers/passwordController";

const router = Router();

// V2 Routes

// POST /api/v2/forgot-password - Initiate password reset process
router.post(
	"/api/v2/forgot-password",
	passwordValidators.forgotPassword,
	passwordController.forgotPassword
);

// POST /api/v2/reset-password - Complete password reset using valid token
router.post(
	"/api/v2/reset-password",
	passwordValidators.resetPassword,
	passwordController.resetPassword
);

export default router;