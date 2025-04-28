import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedUser } from "../../types/types";
import jwt from "jsonwebtoken";
import logger from "../services/logger";

// Safe way to access JWT_SECRET without non-null assertion
const JWT_SECRET = process.env.JWT_SECRET || "";
if (!JWT_SECRET) {
  logger.error("JWT_SECRET is not configured! Authentication will fail.");
}

/**
 * Authenticate user token middleware
 * Optimized for performance and better error handling
 */
function authenticateToken(req: Request, res: Response, next: NextFunction) {
	const authHeader = req.headers.authorization;
	const token = authHeader?.split(" ")[1];

	if (!token) {
		logger.debug("No token provided");
		return res.status(401).json({
			data: {
				message: "Only logged in users can access this route, please log in.",
			},
		});
	}

	try {
		// Use synchronous version for slightly better performance
		// This is a hot path executed on every protected request
		const user = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
		req.user = user;
		
		// Add request timing for performance monitoring
		const start = Date.now();
		
		// Add response finish handler to log slow requests
		res.on('finish', () => {
			const duration = Date.now() - start;
			if (duration > 1000) { // Log requests taking over 1 second
				logger.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`, {
					userId: user.id,
					method: req.method,
					path: req.path,
					duration
				});
			}
		});
		
		next();
	} catch (err) {
		// Handle different types of JWT errors
		if (err instanceof jwt.TokenExpiredError) {
			logger.info("Token expired", { 
				expiredAt: err.expiredAt
			});
			return res.status(401).json({
				data: { message: "Your session has expired. Please log in again." },
			});
		} else if (err instanceof jwt.JsonWebTokenError) {
			logger.warn("Invalid token", { 
				error: err.message
			});
			return res.status(403).json({
				data: { message: "Invalid authentication token." },
			});
		} else {
			logger.error("Token verification error", { 
				error: err instanceof Error ? err.message : "Unknown error",
				stack: err instanceof Error ? err.stack : undefined
			});
			return res.status(403).json({
				data: { message: "Token is no longer valid or has expired." },
			});
		}
	}
}

export default authenticateToken;
