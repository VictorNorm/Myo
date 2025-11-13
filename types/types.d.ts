import type { Request } from "express";

/**
 * Authenticated user type attached to requests after JWT verification
 */
export interface AuthenticatedUser {
	id: number;
	firstname: string;
	lastname: string;
	username: string;
	role: string;
	iat?: number;
	exp?: number;
}

/**
 * Extended Express Request type with authenticated user
 */
export interface AuthenticatedRequest extends Request {
	user?: AuthenticatedUser;
}

declare global {
	namespace Express {
		interface Request {
			user?: AuthenticatedUser;
		}
	}
}

// export type ExperienceLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

// export interface UserSettings {
// 	experienceLevel: ExperienceLevel;
// 	dumbbellIncrement: number; // in kg
// 	useMetric: boolean;
// 	darkMode: boolean;
// 	// Add any other settings as needed
// }

// // Progression multipliers based on experience level
// export const EXPERIENCE_MULTIPLIERS = {
// 	BEGINNER: 1.5, // Faster progression
// 	INTERMEDIATE: 1.0, // Normal progression
// 	ADVANCED: 0.75, // Slower progression
// };

// types.ts

// Equipment types from the database
export type EquipmentType =
	| "DUMBBELL"
	| "BARBELL"
	| "CABLE"
	| "MACHINE"
	| "BODYWEIGHT";

// Experience levels from the database
export type ExperienceLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";

// Program goals from the database
export type Goal = "HYPERTROPHY" | "STRENGTH";

// Exercise data needed for progression calculation
export interface ExerciseData {
	sets: number;
	reps: number;
	weight: number;
	rating: number;
	equipment_type: EquipmentType;
	is_compound: boolean;
	exercise_name: string;
}

// Result of progression calculation
export interface ProgressionResult {
	newWeight: number;
	newReps: number;
	deload?: boolean;
}

// User's equipment settings that control weight increments
export interface UserEquipmentSettings {
	barbellIncrement: number;
	dumbbellIncrement: number;
	cableIncrement: number;
	machineIncrement: number;
	useAdaptiveIncrements?: boolean; // New flag to toggle adaptive increments
	experienceLevel?: ExperienceLevel;
}

// Database model for progression history
export interface ProgressionHistory {
	id?: number;
	exercise_id: number;
	user_id: number;
	program_id: number;
	oldWeight: number;
	newWeight: number;
	oldReps: number;
	newReps: number;
	reason: string;
	createdAt?: Date;
}

// Preview of progression result for UI display
export interface ProgressionPreview {
	newWeight: number;
	newReps: number;
	percentChange: number;
	absoluteChange: number;
}
