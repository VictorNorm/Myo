import type { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import type { AuthenticatedUser } from "../../types/types";
import { success, error, validationError, ErrorCodes } from "../../types/responses";
import { authService } from "../services/authService";
import logger from "../services/logger";
import passport from "../config/passport";

interface AuthenticatedRequest extends Request {
	user?: AuthenticatedUser;
}

export const authValidators = {
	signup: [
		body("firstName")
			.notEmpty()
			.withMessage("First name is required")
			.trim(),
		body("lastName")
			.notEmpty()
			.withMessage("Last name is required")
			.trim(),
		body("email")
			.isEmail()
			.withMessage("Please provide a valid email address")
			.normalizeEmail(),
		body("password")
			.isLength({ min: 8 })
			.withMessage("Password must be at least 8 characters long")
			.matches(/[a-z]/)
			.withMessage("Password must contain at least one lowercase letter")
			.matches(/[A-Z]/)
			.withMessage("Password must contain at least one uppercase letter")
			.matches(/\d/)
			.withMessage("Password must contain at least one number")
			.matches(/[@$!%*?&]/)
			.withMessage("Password must contain at least one special character (@$!%*?&)"),
	],

	login: [
		body("username")
			.notEmpty()
			.withMessage("Email is required"),
		body("password")
			.notEmpty()
			.withMessage("Password is required"),
	],
};

export const authController = {
	// POST /signup - Register new user
	signup: async (req: Request, res: Response) => {
		try {
			const errors = validationResult(req);
			if (!errors.isEmpty()) {
				return res.status(400).json(
					validationError(errors.array())
				);
			}

			const { firstName, lastName, email, password } = req.body;

			const result = await authService.createUserAccount({
				firstName,
				lastName,
				email,
				password,
			});

			if (result.success) {
				res.status(201).json(
					success({ userId: result.userId }, result.message)
				);
			} else {
				res.status(400).json(
					error("registration_failed", result.message)
				);
			}
		} catch (err) {
			logger.error("Error in signup controller", {
				error: err instanceof Error ? err.message : "Unknown error",
				email: req.body.email ? `${req.body.email.substring(0, 3)}***` : undefined,
				stack: err instanceof Error ? err.stack : undefined,
			});

			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"An error occurred while creating the account",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	// POST /login - Authenticate user
	login: (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json(
				validationError(errors.array())
			);
		}

		passport.authenticate("local", (err: Error | null, user: any, info: any) => {
			if (err) {
				logger.error("Passport authentication error in login controller", {
					error: err.message,
					username: req.body.username ? `${req.body.username.substring(0, 3)}***` : undefined,
				});
				return res.status(500).json(
					error(ErrorCodes.INTERNAL_ERROR, "Authentication service error")
				);
			}

			if (!user) {
				return res.status(401).json(
					error(ErrorCodes.UNAUTHORIZED, "Invalid email or password")
				);
			}

			try {
				const token = authService.generateAuthToken({
					id: user.id,
					role: user.role,
					firstname: user.firstname,
					lastname: user.lastname,
					username: user.username,
				});

				// REMOVED: Legacy format check - always use standard format
				res.status(200).json(
					success({ token }, "Login successful")
				);
			} catch (tokenError) {
				logger.error("Token generation error in login controller", {
					error: tokenError instanceof Error ? tokenError.message : "Unknown error",
					userId: user.id,
				});
				return res.status(500).json(
					error(ErrorCodes.INTERNAL_ERROR, "Failed to generate authentication token")
				);
			}
		})(req, res, next);
	},

	// GET /verify-email - Verify email address
	verifyEmail: async (req: Request, res: Response) => {
		try {
			const token = req.query.token;

			if (typeof token !== "string") {
				return res.status(400).json(
					error("invalid_request", "Verification token is missing or invalid")
				);
			}

			const result = await authService.verifyEmail(token);

			if (result.success) {
				res.status(200).json(
					success({ verified: true }, result.message)
				);
			} else {
				res.status(400).json(
					error("verification_failed", result.message)
				);
			}
		} catch (err) {
			logger.error("Error in verifyEmail controller", {
				error: err instanceof Error ? err.message : "Unknown error",
				tokenPresent: !!req.query.token,
				stack: err instanceof Error ? err.stack : undefined,
			});

			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"An error occurred during email verification",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	// GET /protectedRoute - Test protected route
	testProtectedRoute: async (req: AuthenticatedRequest, res: Response) => {
		try {
			res.status(200).json(
				success(
					{ message: "Access granted" },
					"Protected route accessed successfully"
				)
			);
		} catch (err) {
			logger.error("Error in testProtectedRoute controller", {
				error: err instanceof Error ? err.message : "Unknown error",
				userId: req.user?.id,
			});

			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to access protected route",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},

	// GET /verificationSuccessful - Verification success page
	verificationSuccessful: async (req: AuthenticatedRequest, res: Response) => {
		try {
			res.status(200).json(
				success(
					{ verified: true },
					"Email verification successful"
				)
			);
		} catch (err) {
			logger.error("Error in verificationSuccessful controller", {
				error: err instanceof Error ? err.message : "Unknown error",
				userId: req.user?.id,
			});

			res.status(500).json(
				error(
					ErrorCodes.INTERNAL_ERROR,
					"Failed to retrieve verification status",
					err instanceof Error ? err.message : undefined
				)
			);
		}
	},
};