import type { Request, Response } from "express";
import { body, validationResult } from "express-validator";
import { passwordService } from "../services/passwordService";
import logger from "../services/logger";

export const passwordValidators = {
	forgotPassword: [
		body("email")
			.isEmail()
			.withMessage("Please provide a valid email address")
			.normalizeEmail()
			.isLength({ min: 1, max: 255 })
			.withMessage("Email must be between 1 and 255 characters"),
	],

	resetPassword: [
		body("token")
			.isString()
			.withMessage("Token must be a string")
			.isLength({ min: 32, max: 128 })
			.withMessage("Token must be between 32 and 128 characters")
			.matches(/^[a-fA-F0-9]+$/)
			.withMessage("Token must contain only hexadecimal characters"),
		
		body("newPassword")
			.isString()
			.withMessage("Password must be a string")
			.isLength({ min: 8, max: 128 })
			.withMessage("Password must be between 8 and 128 characters")
			.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/)
			.withMessage(
				"Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
			),
	],
};

export const passwordController = {
	// POST /forgot-password
	forgotPassword: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				logger.warn("Forgot password validation failed", {
					errors: errors.array(),
					ip: req.ip,
					userAgent: req.get("User-Agent"),
				});
				
				return res.status(400).json({
					errors: errors.array(),
					message: "Validation failed"
				});
			}

			const { email } = req.body;

			// Security logging
			logger.info("Forgot password request received", {
				email,
				ip: req.ip,
				userAgent: req.get("User-Agent"),
			});

			// Rate limiting check (placeholder)
			const isAllowed = await passwordService.checkRateLimit(email);
			if (!isAllowed) {
				logger.warn("Forgot password rate limit exceeded", {
					email,
					ip: req.ip,
				});
				
				return res.status(429).json({
					error: "Too many requests",
					message: "Please wait before requesting another password reset"
				});
			}

			// Process the request
			await passwordService.processForgotPasswordRequest({ email });

			// Always return success for security (prevent email enumeration)
			return res.status(200).json({
				message: "If this email is registered with us, you will receive a password reset link shortly"
			});

		} catch (error) {
			logger.error(
				`Error in forgot password controller: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					email: req.body.email,
					ip: req.ip,
					userAgent: req.get("User-Agent"),
				}
			);

			// Don't reveal internal errors for security
			return res.status(500).json({
				error: "Internal server error",
				message: "An error occurred while processing your request"
			});
		}
	},

	// POST /reset-password
	resetPassword: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				logger.warn("Reset password validation failed", {
					errors: errors.array(),
					ip: req.ip,
					userAgent: req.get("User-Agent"),
				});
				
				return res.status(400).json({
					errors: errors.array(),
					message: "Validation failed"
				});
			}

			const { token, newPassword } = req.body;

			// Security logging
			logger.info("Password reset attempt", {
				tokenProvided: !!token,
				tokenLength: token?.length,
				ip: req.ip,
				userAgent: req.get("User-Agent"),
			});

			// Process the password reset
			await passwordService.processPasswordReset({ token, newPassword });

			// Success response
			return res.status(200).json({
				message: "Password has been successfully reset"
			});

		} catch (error) {
			logger.error(
				`Error in reset password controller: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					ip: req.ip,
					userAgent: req.get("User-Agent"),
				}
			);

			// Handle specific error types for better user experience
			if (error instanceof Error) {
				// Token-related errors
				if (error.message.includes("Invalid or expired reset token") ||
					error.message.includes("Invalid reset token")) {
					return res.status(400).json({
						error: "Invalid token",
						message: "The password reset link is invalid or has expired. Please request a new one."
					});
				}

				// Password validation errors
				if (error.message.includes("Password must")) {
					return res.status(400).json({
						error: "Invalid password",
						message: error.message
					});
				}

				// State errors
				if (error.message.includes("Invalid reset token state")) {
					return res.status(400).json({
						error: "Invalid request",
						message: "Password reset request is in an invalid state. Please start over."
					});
				}
			}

			// Generic error response
			return res.status(500).json({
				error: "Internal server error",
				message: "An error occurred while resetting your password"
			});
		}
	},

	// Security utilities
	logSecurityEvent(event: string, req: Request, details?: Record<string, any>) {
		logger.warn(`Security Event: ${event}`, {
			...details,
			ip: req.ip,
			userAgent: req.get("User-Agent"),
			timestamp: new Date().toISOString(),
			event,
		});
	},

	// Sanitize sensitive data from logs
	sanitizeForLogging(data: any): any {
		if (!data || typeof data !== 'object') return data;
		
		const sanitized = { ...data };
		
		// Remove sensitive fields
		const sensitiveFields = ['password', 'newPassword', 'token', 'resetToken'];
		for (const field of sensitiveFields) {
			if (sanitized[field]) {
				sanitized[field] = '[REDACTED]';
			}
		}
		
		return sanitized;
	},
};