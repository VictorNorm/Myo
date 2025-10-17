import type { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import type { AuthenticatedUser } from "../../types/types";
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
				return res.status(400).json({
					message: "Validation failed",
					errors: errors.array().map(error => error.msg),
				});
			}

			const { firstName, lastName, email, password } = req.body;

			if (!firstName || !lastName || !email || !password) {
				return res.status(400).json({
					message: "Validation failed",
					errors: ["All fields are required"],
				});
			}

			const result = await authService.createUserAccount({
				firstName,
				lastName,
				email,
				password,
			});

			if (result.success) {
				res.status(201).json({
					data: { userId: result.userId },
					message: result.message,
				});
			} else {
				res.status(400).json({
					message: "Registration failed",
					errors: [result.message],
				});
			}
		} catch (error) {
			logger.error("Error in signup controller", {
				error: error instanceof Error ? error.message : "Unknown error",
				email: req.body.email ? `${req.body.email.substring(0, 3)}***` : undefined,
				stack: error instanceof Error ? error.stack : undefined,
			});

			res.status(500).json({
				message: "Internal server error",
				errors: ["An error occurred while creating the user."],
			});
		}
	},

	// POST /login - Authenticate user
	login: (req: Request, res: Response, next: NextFunction) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({
				message: "Validation failed",
				errors: errors.array().map(error => error.msg),
			});
		}

		passport.authenticate("local", (err: Error | null, user: any, info: any) => {
			if (err) {
				logger.error("Passport authentication error in login controller", {
					error: err.message,
					username: req.body.username ? `${req.body.username.substring(0, 3)}***` : undefined,
				});
				return res.status(500).json({
					message: "Internal server error",
					errors: ["Authentication service error"],
				});
			}

			if (!user) {
				return res.status(401).json({
					message: "Authentication failed",
					errors: ["Invalid email or password"],
				});
			}

			try {
				const token = authService.generateAuthToken({
					id: user.id,
					role: user.role,
					firstname: user.firstname,
					lastname: user.lastname,
					username: user.username,
				});

				// Check if this is a V2 API endpoint for response format
				if (req.path.includes('/api/v2/')) {
					res.status(200).json({
						data: { token },
						message: "Login successful",
					});
				} else {
					// Legacy format for backward compatibility
					res.json({ token });
				}
			} catch (tokenError) {
				logger.error("Token generation error in login controller", {
					error: tokenError instanceof Error ? tokenError.message : "Unknown error",
					userId: user.id,
				});
				return res.status(500).json({
					message: "Internal server error",
					errors: ["Failed to generate authentication token"],
				});
			}
		})(req, res, next);
	},

	// GET /verify-email - Verify email address
	verifyEmail: async (req: Request, res: Response) => {
		try {
			const token = req.query.token;

			if (typeof token !== "string") {
				return res.status(400).json({
					message: "Invalid request",
					errors: ["Verification token is missing or invalid."],
				});
			}

			const result = await authService.verifyEmail(token);

			if (result.success) {
				res.status(200).json({
					data: { verified: true },
					message: result.message,
				});
			} else {
				res.status(400).json({
					message: "Verification failed",
					errors: [result.message],
				});
			}
		} catch (error) {
			logger.error("Error in verifyEmail controller", {
				error: error instanceof Error ? error.message : "Unknown error",
				tokenPresent: !!req.query.token,
				stack: error instanceof Error ? error.stack : undefined,
			});

			res.status(500).json({
				message: "Internal server error",
				errors: ["Server error. Please try again later."],
			});
		}
	},

	// GET /protectedRoute - Test protected route
	testProtectedRoute: async (req: AuthenticatedRequest, res: Response) => {
		try {
			res.status(200).json({
				data: {
					message: "You can access protected routes, because you are logged in, like a healthy adult.",
				},
				message: "Protected route accessed successfully",
			});
		} catch (error) {
			logger.error("Error in testProtectedRoute controller", {
				error: error instanceof Error ? error.message : "Unknown error",
				userId: req.user?.id,
			});

			res.status(500).json({
				message: "Internal server error",
				errors: ["Failed to access protected route"],
			});
		}
	},

	// GET /verificationSuccessful - Verification success page
	verificationSuccessful: async (req: AuthenticatedRequest, res: Response) => {
		try {
			res.status(200).json({
				data: {
					message: "Your email has been successfully verified, please continue in the app.",
				},
				message: "Email verification status retrieved",
			});
		} catch (error) {
			logger.error("Error in verificationSuccessful controller", {
				error: error instanceof Error ? error.message : "Unknown error",
				userId: req.user?.id,
			});

			res.status(500).json({
				message: "Internal server error",
				errors: ["Failed to retrieve verification status"],
			});
		}
	},
};