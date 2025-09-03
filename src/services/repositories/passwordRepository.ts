import prisma from "../db";

// Password reset interfaces
export interface UserForPasswordReset {
	id: number;
	username: string;
	resetToken: string | null;
	resetTokenExpiry: Date | null;
}

export interface UpdateUserWithResetToken {
	username: string;
	resetToken: string;
	resetTokenExpiry: Date;
}

export interface ResetPasswordData {
	userId: number;
	newPasswordHash: string;
}

export const passwordRepository = {
	// Find user by username for password reset
	async findUserByUsername(username: string): Promise<UserForPasswordReset | null> {
		return prisma.users.findUnique({
			where: { username },
			select: {
				id: true,
				username: true,
				resetToken: true,
				resetTokenExpiry: true,
			},
		});
	},

	// Update user with reset token and expiry
	async setResetToken(data: UpdateUserWithResetToken): Promise<void> {
		await prisma.users.update({
			where: { username: data.username },
			data: {
				resetToken: data.resetToken,
				resetTokenExpiry: data.resetTokenExpiry,
			},
		});
	},

	// Find user with valid (non-expired) reset token
	async findUserWithValidResetToken(): Promise<UserForPasswordReset | null> {
		return prisma.users.findFirst({
			where: {
				resetToken: { not: null },
				resetTokenExpiry: { gt: new Date() },
			},
			select: {
				id: true,
				username: true,
				resetToken: true,
				resetTokenExpiry: true,
			},
		});
	},

	// Update password and clear reset token
	async resetPassword(data: ResetPasswordData): Promise<void> {
		await prisma.users.update({
			where: { id: data.userId },
			data: {
				password_hash: data.newPasswordHash,
				resetToken: null,
				resetTokenExpiry: null,
			},
		});
	},

	// Check if user exists by username (for validation)
	async userExists(username: string): Promise<boolean> {
		const user = await prisma.users.findUnique({
			where: { username },
			select: { id: true },
		});
		return user !== null;
	},
};