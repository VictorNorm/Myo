import { Router } from "express";
import { passwordController, passwordValidators } from "../controllers/passwordController";

const router = Router();

/**
 * POST /forgot-password
 * Initiate password reset process by sending reset email
 * - Generates secure reset token with expiration
 * - Sends professional email with reset link
 * - Always returns success to prevent email enumeration
 * - Includes rate limiting and security logging
 */
router.post(
	"/forgot-password",
	passwordValidators.forgotPassword,
	passwordController.forgotPassword
);

/**
 * POST /reset-password
 * Complete password reset using valid token
 * - Validates reset token against database
 * - Enforces strong password requirements
 * - Clears reset token after successful reset
 * - Comprehensive security logging and audit trail
 */
router.post(
	"/reset-password",
	passwordValidators.resetPassword,
	passwordController.resetPassword
);

export default router;