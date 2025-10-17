import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { UserRole } from "@prisma/client";
import { authRepository, type UserForAuth } from "./repositories/authRepository";
import logger from "./logger";
import sendVerificationEmail from "../middleware/sendEmail";

export interface AuthResponse {
	success: boolean;
	userId?: number;
	message: string;
}

export interface UserToken {
	id: number;
	role: string;
	firstname: string;
	lastname: string;
	username: string;
}

export interface CreateUserRequest {
	firstName: string;
	lastName: string;
	email: string;
	password: string;
}

export const authService = {
	// Authenticate user with username and password
	async authenticateUser(username: string, password: string): Promise<UserForAuth | null> {
		logger.debug("Authenticating user", { 
			username: username ? `${username.substring(0, 3)}***` : undefined 
		});

		try {
			const user = await authRepository.findUserByUsername(username);

			if (!user) {
				logger.debug("User not found during authentication", { 
					username: username ? `${username.substring(0, 3)}***` : undefined 
				});
				return null;
			}

			const isValid = await bcrypt.compare(password, user.password_hash);

			if (!isValid) {
				logger.debug("Invalid password during authentication", { 
					username: username ? `${username.substring(0, 3)}***` : undefined 
				});
				return null;
			}

			logger.debug("User authenticated successfully", { 
				userId: user.id,
				username: username ? `${username.substring(0, 3)}***` : undefined 
			});

			return user;
		} catch (error) {
			logger.error("Authentication error", {
				username: username ? `${username.substring(0, 3)}***` : undefined,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined
			});
			throw error;
		}
	},

	// Create new user account with email verification
	async createUserAccount(data: CreateUserRequest): Promise<AuthResponse> {
		logger.debug("Creating new user account", { 
			email: data.email ? `${data.email.substring(0, 3)}***` : undefined,
			firstName: data.firstName,
			lastName: data.lastName
		});

		try {
			// Check if user already exists
			const existingUser = await authRepository.userExistsByUsername(data.email.toLowerCase());
			
			if (existingUser) {
				logger.warn("Attempted registration with existing email", {
					email: data.email ? `${data.email.substring(0, 3)}***` : undefined
				});
				return {
					success: false,
					message: "A user is already registered with that email."
				};
			}

			// Hash password
			const password_hash = await this.hashPassword(data.password);
			
			// Generate verification token
			const verificationToken = this.generateVerificationToken();
			
			// Create user
			const newUser = await authRepository.createUser({
				firstname: data.firstName,
				lastname: data.lastName,
				username: data.email.toLowerCase(),
				password_hash,
				role: UserRole.USER,
				verificationToken,
				verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
				emailVerified: false,
			});

			// Send verification email
			await sendVerificationEmail(data.email, verificationToken);

			logger.info("User account created successfully", {
				userId: newUser.id,
				email: data.email ? `${data.email.substring(0, 3)}***` : undefined
			});

			return {
				success: true,
				userId: newUser.id,
				message: "You've successfully created an account. Please verify your email."
			};
		} catch (error) {
			logger.error("Error creating user account", {
				email: data.email ? `${data.email.substring(0, 3)}***` : undefined,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined
			});
			
			return {
				success: false,
				message: "An error occurred while creating the user."
			};
		}
	},

	// Generate JWT token for authenticated user
	generateAuthToken(user: UserToken): string {
		logger.debug("Generating auth token", { userId: user.id });

		if (!process.env.JWT_SECRET) {
			throw new Error("JWT_SECRET is not defined in the environment variables.");
		}

		const token = jwt.sign(
			{
				id: user.id,
				role: user.role,
				firstName: user.firstname,
				lastName: user.lastname,
				username: user.username,
			},
			process.env.JWT_SECRET,
			{ expiresIn: "168h" }
		);

		logger.debug("Auth token generated successfully", { userId: user.id });
		return token;
	},

	// Verify email with token
	async verifyEmail(token: string): Promise<AuthResponse> {
		logger.debug("Verifying email with token", { tokenPresent: !!token });

		try {
			if (!token) {
				return {
					success: false,
					message: "Verification token is missing or invalid."
				};
			}

			const user = await authRepository.findUserByVerificationToken(token);

			if (!user) {
				logger.warn("Invalid verification token", { tokenPresent: !!token });
				return {
					success: false,
					message: "Invalid verification token."
				};
			}

			if (!user.verificationTokenExpires) {
				return {
					success: false,
					message: "Verification token expires is null."
				};
			}

			if (user.verificationTokenExpires < new Date()) {
				logger.warn("Expired verification token", { 
					tokenPresent: !!token,
					userId: user.id 
				});
				return {
					success: false,
					message: "Verification token has expired."
				};
			}

			if (user.emailVerified) {
				return {
					success: true,
					message: "Email already verified. You can now log in."
				};
			}

			// Update user to verified status
			await authRepository.verifyUserEmail(user.id);

			logger.info("Email verified successfully", { userId: user.id });

			return {
				success: true,
				message: "Email verified successfully. You can now log in."
			};
		} catch (error) {
			logger.error("Email verification error", {
				tokenPresent: !!token,
				error: error instanceof Error ? error.message : "Unknown error",
				stack: error instanceof Error ? error.stack : undefined
			});

			return {
				success: false,
				message: "Server error. Please try again later."
			};
		}
	},

	// Helper: Generate verification token
	generateVerificationToken(): string {
		return crypto.randomBytes(32).toString("hex");
	},

	// Helper: Hash password
	async hashPassword(password: string): Promise<string> {
		return await bcrypt.hash(password, 10);
	},

	// Helper: Compare password
	async comparePassword(password: string, hash: string): Promise<boolean> {
		return await bcrypt.compare(password, hash);
	}
};