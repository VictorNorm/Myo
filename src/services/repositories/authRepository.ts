import prisma from "../db";
import { UserRole } from "@prisma/client";

// Auth-related interfaces
export interface UserForAuth {
	id: number;
	username: string;
	password_hash: string;
	role: string;
	firstname: string;
	lastname: string;
	emailVerified: boolean;
}

export interface UserForVerification {
	id: number;
	verificationToken: string | null;
	verificationTokenExpires: Date | null;
	emailVerified: boolean;
}

export interface CreateUserData {
	firstname: string;
	lastname: string;
	username: string;
	password_hash: string;
	role: UserRole;
	verificationToken: string;
	verificationTokenExpires: Date;
	emailVerified: boolean;
}

export const authRepository = {
	// Find user by username for authentication
	async findUserByUsername(username: string): Promise<UserForAuth | null> {
		return prisma.users.findUnique({
			where: { username },
			select: {
				id: true,
				username: true,
				password_hash: true,
				role: true,
				firstname: true,
				lastname: true,
				emailVerified: true,
			},
		});
	},

	// Find user by verification token
	async findUserByVerificationToken(token: string): Promise<UserForVerification | null> {
		return prisma.users.findFirst({
			where: { verificationToken: token },
			select: {
				id: true,
				verificationToken: true,
				verificationTokenExpires: true,
				emailVerified: true,
			},
		});
	},

	// Create new user with verification token
	async createUser(data: CreateUserData): Promise<UserForAuth> {
		return prisma.users.create({
			data: {
				firstname: data.firstname,
				lastname: data.lastname,
				username: data.username,
				password_hash: data.password_hash,
				role: data.role,
				verificationToken: data.verificationToken,
				verificationTokenExpires: data.verificationTokenExpires,
				emailVerified: data.emailVerified,
			},
			select: {
				id: true,
				username: true,
				password_hash: true,
				role: true,
				firstname: true,
				lastname: true,
				emailVerified: true,
			},
		});
	},

	// Update user email verification status
	async verifyUserEmail(userId: number): Promise<void> {
		await prisma.users.update({
			where: { id: userId },
			data: {
				emailVerified: true,
				verificationToken: null,
				verificationTokenExpires: null,
			},
		});
	},

	// Check if user exists by username
	async userExistsByUsername(username: string): Promise<boolean> {
		const user = await prisma.users.findUnique({
			where: { username },
			select: { id: true },
		});
		return user !== null;
	},
};