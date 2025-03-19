import { Request, Response, NextFunction } from "express";

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

// Global error handling middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error:", err);

  // Handle known error types
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  // Handle Prisma errors (can be expanded for different Prisma error codes)
  if (err.name === "PrismaClientKnownRequestError") {
    return res.status(400).json({
      error: "Database operation failed",
      details: err.message,
    });
  }

  // Default error response for unhandled errors
  return res.status(500).json({
    error: "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};