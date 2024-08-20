import type { Request, Response, NextFunction } from "express";
import type { AuthenticatedUser } from "../../types/types";
import jwt from "jsonwebtoken";

function authenticateToken(req: Request, res: Response, next: NextFunction) {
	const authHeader = req.headers.authorization;
	const token = authHeader?.split(" ")[1];

	if (token == null) {
		console.log("No token provided");
		return res
			.status(401)
			.json({
				data: {
					message: "Only logged in users can access this route, please log in.",
				},
			});
	}

	// biome-ignore lint/style/noNonNullAssertion: <explanation>
	jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
		if (err) {
			console.error("Token verification error:", err);
			return res
				.status(403)
				.json({
					data: { message: "Token is no longer valid or has expired." },
				});
		}

		// req.user = user as any;
		req.user = user as AuthenticatedUser;
		next();
	});
}

export default authenticateToken;
