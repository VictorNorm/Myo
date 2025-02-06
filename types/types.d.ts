import type { Request } from "express";

interface User {
	id: number;
	username: string;
	firstName: string;
	lastName: string;
	// Add other user properties if needed
}

interface AuthenticatedRequest extends Request {
	user?: User;
}

declare global {
	namespace Express {
		interface Request {
			user?: AuthenticatedUser;
		}
	}
}

export interface AuthenticatedUser {
	id: number;
	firstName: string;
	lastName: string;
	username: string;
	iat?: number;
	exp?: number;
	role: string;
}

export type ExperienceLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

export interface UserSettings {
	experienceLevel: ExperienceLevel;
	dumbbellIncrement: number; // in kg
	useMetric: boolean;
	darkMode: boolean;
	// Add any other settings as needed
}

// Progression multipliers based on experience level
export const EXPERIENCE_MULTIPLIERS = {
	BEGINNER: 1.5, // Faster progression
	INTERMEDIATE: 1.0, // Normal progression
	ADVANCED: 0.75, // Slower progression
};
