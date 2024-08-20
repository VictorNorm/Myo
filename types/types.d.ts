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
}
