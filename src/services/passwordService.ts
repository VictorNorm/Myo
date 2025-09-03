import bcrypt from "bcrypt";
import crypto from "node:crypto";
import nodemailer from "nodemailer";
import {
	passwordRepository,
	type UserForPasswordReset,
	type UpdateUserWithResetToken,
	type ResetPasswordData,
} from "./repositories/passwordRepository";
import logger from "./logger";

// Service interfaces
export interface ForgotPasswordRequest {
	email: string;
}

export interface ResetPasswordRequest {
	token: string;
	newPassword: string;
}

export interface EmailConfig {
	host: string;
	port: number;
	secure: boolean;
	user: string;
	pass: string;
}

export const passwordService = {
	// Process forgot password request
	async processForgotPasswordRequest(request: ForgotPasswordRequest): Promise<void> {
		try {
			// Check if user exists
			const userExists = await passwordRepository.userExists(request.email);
			if (!userExists) {
				// For security, don't reveal if user exists - always respond with success
				logger.warn("Password reset attempted for non-existent user", {
					email: request.email,
				});
				return; // Still return success to prevent email enumeration
			}

			// Generate secure reset token
			const resetToken = this.generateResetToken();
			const resetTokenExpiry = this.getTokenExpiryDate();

			// Hash the token before storing
			const hashedResetToken = await this.hashToken(resetToken);

			// Update user with reset token
			const updateData: UpdateUserWithResetToken = {
				username: request.email,
				resetToken: hashedResetToken,
				resetTokenExpiry,
			};

			await passwordRepository.setResetToken(updateData);

			// Send reset email
			await this.sendPasswordResetEmail(request.email, resetToken);

			logger.info("Password reset process initiated", {
				email: request.email,
				tokenExpiry: resetTokenExpiry,
			});
		} catch (error) {
			logger.error(
				`Error processing forgot password request: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					email: request.email,
				}
			);
			throw error;
		}
	},

	// Process password reset
	async processPasswordReset(request: ResetPasswordRequest): Promise<void> {
		try {
			// Find user with valid reset token
			const user = await passwordRepository.findUserWithValidResetToken();

			if (!user) {
				logger.warn("Password reset attempted with invalid or expired token", {
					tokenProvided: !!request.token,
				});
				throw new Error("Invalid or expired reset token");
			}

			if (user.resetToken === null) {
				logger.warn("User reset token is null despite database query constraint", {
					userId: user.id,
				});
				throw new Error("Invalid reset token state");
			}

			// Verify the provided token against the hashed token
			const isValidToken = await this.verifyToken(request.token, user.resetToken);

			if (!isValidToken) {
				logger.warn("Invalid reset token verification", {
					userId: user.id,
				});
				throw new Error("Invalid reset token");
			}

			// Validate password strength
			this.validatePasswordStrength(request.newPassword);

			// Hash the new password
			const hashedPassword = await this.hashPassword(request.newPassword);

			// Update password and clear reset token
			const resetData: ResetPasswordData = {
				userId: user.id,
				newPasswordHash: hashedPassword,
			};

			await passwordRepository.resetPassword(resetData);

			logger.info("Password successfully reset", {
				userId: user.id,
				username: user.username,
			});
		} catch (error) {
			logger.error(
				`Error resetting password: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
				}
			);
			throw error;
		}
	},

	// Security helper methods
	generateResetToken(): string {
		return crypto.randomBytes(32).toString("hex"); // Increased from 20 to 32 bytes for better security
	},

	getTokenExpiryDate(): Date {
		const EXPIRY_HOURS = 1;
		return new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);
	},

	async hashToken(token: string): Promise<string> {
		const SALT_ROUNDS = 12; // Increased from 10 for better security
		return bcrypt.hash(token, SALT_ROUNDS);
	},

	async hashPassword(password: string): Promise<string> {
		const SALT_ROUNDS = 12;
		return bcrypt.hash(password, SALT_ROUNDS);
	},

	async verifyToken(token: string, hashedToken: string): Promise<boolean> {
		return bcrypt.compare(token, hashedToken);
	},

	validatePasswordStrength(password: string): void {
		const MIN_LENGTH = 8;
		const hasUpperCase = /[A-Z]/.test(password);
		const hasLowerCase = /[a-z]/.test(password);
		const hasNumbers = /\d/.test(password);
		const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

		if (password.length < MIN_LENGTH) {
			throw new Error(`Password must be at least ${MIN_LENGTH} characters long`);
		}

		if (!hasUpperCase) {
			throw new Error("Password must contain at least one uppercase letter");
		}

		if (!hasLowerCase) {
			throw new Error("Password must contain at least one lowercase letter");
		}

		if (!hasNumbers) {
			throw new Error("Password must contain at least one number");
		}

		if (!hasSpecialChar) {
			throw new Error("Password must contain at least one special character");
		}
	},

	// Email service methods
	async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
		try {
			const resetLink = this.generateResetLink(resetToken);
			const emailContent = this.generateEmailContent(resetLink);

			// Create transporter based on environment
			const transporter = await this.createEmailTransporter();

			// Send email
			const mailOptions = {
				from: '"Myo Fitness" <noreply@myofitness.no>',
				to: email,
				subject: "Password Reset Request - Myo Fitness",
				text: emailContent.text,
				html: emailContent.html,
			};

			const info = await transporter.sendMail(mailOptions);

			logger.info("Password reset email sent successfully", {
				email,
				messageId: info.messageId,
				...(process.env.NODE_ENV !== "production" && {
					previewUrl: nodemailer.getTestMessageUrl(info),
				}),
			});
		} catch (error) {
			logger.error(
				`Error sending password reset email: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					email,
				}
			);
			throw error;
		}
	},

	generateResetLink(token: string): string {
		if (process.env.NODE_ENV === "production") {
			return `https://app.myofitness.no/reset-password?token=${token}`;
		} else {
			return `Myo://reset-password?token=${token}`;
		}
	},

	generateEmailContent(resetLink: string): { text: string; html: string } {
		const text = `
You requested a password reset for your Myo Fitness account.

Please use the following link to reset your password:
${resetLink}

This link will expire in 1 hour for security reasons.

If you did not request this password reset, please ignore this email.

Best regards,
The Myo Fitness Team
		`.trim();

		const html = `
<div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
	<h2 style="color: #333; text-align: center;">Password Reset Request</h2>
	
	<p>You requested a password reset for your Myo Fitness account.</p>
	
	<div style="text-align: center; margin: 30px 0;">
		<a href="${resetLink}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
			Reset Your Password
		</a>
	</div>
	
	<p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
	
	<p>If you did not request this password reset, please ignore this email.</p>
	
	<hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
	
	<p style="color: #666; font-size: 14px;">
		Best regards,<br>
		The Myo Fitness Team
	</p>
</div>
		`.trim();

		return { text, html };
	},

	async createEmailTransporter(): Promise<nodemailer.Transporter> {
		if (process.env.NODE_ENV === "production") {
			// Production email configuration
			if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
				throw new Error("Production email configuration missing");
			}

			return nodemailer.createTransport({
				host: process.env.SMTP_HOST,
				port: Number(process.env.SMTP_PORT) || 587,
				secure: process.env.SMTP_SECURE === "true",
				auth: {
					user: process.env.SMTP_USER,
					pass: process.env.SMTP_PASS,
				},
			});
		} else {
			// Development/testing with Ethereal Email
			const testAccount = await nodemailer.createTestAccount();

			return nodemailer.createTransport({
				host: "smtp.ethereal.email",
				port: 587,
				secure: false,
				auth: {
					user: testAccount.user,
					pass: testAccount.pass,
				},
			});
		}
	},

	// Security audit methods
	logSecurityEvent(event: string, details: Record<string, any>): void {
		logger.warn(`Security Event: ${event}`, {
			...details,
			timestamp: new Date().toISOString(),
			event,
		});
	},

	// Rate limiting check (placeholder for future implementation)
	async checkRateLimit(email: string): Promise<boolean> {
		// TODO: Implement Redis-based rate limiting
		// For now, always allow - this should be implemented for production
		return true;
	},
};