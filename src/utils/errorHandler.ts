import type { Request, Response, NextFunction } from "express";
import logger from "../services/logger";
import { error, ErrorCodes } from "../../types/responses";

function getErrorCode(statusCode: number): string {
	switch (statusCode) {
		case 400: return ErrorCodes.VALIDATION_FAILED;
		case 401: return ErrorCodes.UNAUTHORIZED;
		case 403: return ErrorCodes.FORBIDDEN;
		case 404: return ErrorCodes.NOT_FOUND;
		case 409: return ErrorCodes.CONFLICT;
		case 410: return "gone";
		default:  return ErrorCodes.INTERNAL_ERROR;
	}
}

// Base Error class for application errors
export class AppError extends Error {
	statusCode: number;
	isOperational: boolean;

	constructor(message: string, statusCode: number) {
		super(message);
		this.statusCode = statusCode;
		this.isOperational = true;
		Error.captureStackTrace(this, this.constructor);
	}
}

// Specific error types
export class NotFoundError extends AppError {
	constructor(message = "Resource not found") {
		super(message, 404);
	}
}

export class BadRequestError extends AppError {
	constructor(message = "Bad request") {
		super(message, 400);
	}
}

export class UnauthorizedError extends AppError {
	constructor(message = "Unauthorized") {
		super(message, 401);
	}
}

export class ForbiddenError extends AppError {
	constructor(message = "Forbidden") {
		super(message, 403);
	}
}

export class ConflictError extends AppError {
	constructor(message = "Resource already exists") {
		super(message, 409);
	}
}

// Global error handling middleware
export const errorHandler = (
	err: Error,
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	// Replace console.error with logger.error
	logger.error(`${err.name}: ${err.message}`, {
		path: req.path,
		method: req.method,
		ip: req.ip,
		stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
	});

	// Handle known operational errors (NotFoundError, BadRequestError, etc.)
	if (err instanceof AppError) {
		return res.status(err.statusCode).json(
			error(getErrorCode(err.statusCode), err.message)
		);
	}

	// Handle Prisma known request errors (unique constraint, foreign key, etc.)
	if (err.name === "PrismaClientKnownRequestError") {
		return res.status(400).json(
			error(ErrorCodes.DATABASE_ERROR, "Database operation failed")
		);
	}

	// Unhandled errors — never expose internals in production
	return res.status(500).json(
		error(
			ErrorCodes.INTERNAL_ERROR,
			"Internal server error",
			process.env.NODE_ENV === "development" ? err.message : undefined
		)
	);
};
