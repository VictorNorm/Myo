import { Router, Request } from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
import prisma from "../services/db";
import logger from "../services/logger";
dotenv.config();

const router = Router();

router.get("/users", authenticateToken, async (req, res) => {
	const trainerId = req.body.id;

	interface UserDetail {
		id: number;
		firstName: string;
		lastName: string;
		username: string;
	}

	try {
		const users = await prisma.users.findMany();
		const userDetails: UserDetail[] = [];

		for (const user of users) {
			const relevantUserDetails: UserDetail = {
				id: user.id,
				firstName: user.firstname,
				lastName: user.lastname,
				username: user.username,
			};
			userDetails.push(relevantUserDetails);
		}

		logger.debug("Fetched all users", {
			userId: req.user?.id,
			userRole: req.user?.role,
			userCount: users.length,
		});

		res.status(200).json(userDetails);
	} catch (error) {
		logger.error(
			`Error fetching users: ${error instanceof Error ? error.message : "Unknown error"}`,
			{
				stack: error instanceof Error ? error.stack : undefined,
				userId: req.user?.id,
			},
		);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.post("/assign-user", authenticateToken, async (req, res) => {
	try {
		if (!req.user) {
			logger.warn("Unauthorized user assignment attempt", {
				targetUserId: req.body.userId,
			});
			return res
				.status(401)
				.json({ message: "Unauthorized: User not authenticated" });
		}

		const assignedUser = await prisma.users.update({
			where: { id: req.body.userId },
			data: { trainerId: req.user.id },
		});

		logger.info("User assigned to trainer", {
			trainerId: req.user.id,
			assignedUserId: req.body.userId,
		});

		res.status(200).json("You've successfully assigned a user.");
	} catch (error) {
		logger.error(
			`Error assigning user: ${error instanceof Error ? error.message : "Unknown error"}`,
			{
				stack: error instanceof Error ? error.stack : undefined,
				trainerId: req.user?.id,
				targetUserId: req.body.userId,
			},
		);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/user/:id", authenticateToken, async (req, res) => {
	const userId = Number.parseInt(req.params.id);

	if (Number.isNaN(userId)) {
		logger.warn("Invalid user ID format in request", {
			providedId: req.params.id,
			requestingUserId: req.user?.id,
		});
		return res.status(400).json({ error: "Invalid user ID format" });
	}

	try {
		const user = await prisma.users.findUnique({
			where: { id: userId },
			select: {
				id: true,
				firstname: true,
				lastname: true,
				username: true,
				role: true,
				trainerId: true,
				emailVerified: true,
				created_at: true,
			},
		});

		if (!user) {
			logger.warn("User not found", {
				requestedUserId: userId,
				requestingUserId: req.user?.id,
			});
			return res.status(404).json({ error: "User not found" });
		}

		// Check if the requesting user has permission to view this user
		if (
			req.user &&
			(req.user.role === "ADMIN" ||
				req.user.id === userId ||
				(req.user.role === "TRAINER" && user.trainerId === req.user.id))
		) {
			logger.debug("User details accessed", {
				requestedUserId: userId,
				requestingUserId: req.user.id,
				requestingUserRole: req.user.role,
				accessReason:
					req.user.role === "ADMIN"
						? "admin_access"
						: req.user.id === userId
							? "self_access"
							: "trainer_access",
			});

			res.status(200).json(user);
		} else {
			logger.warn("Unauthorized user details access attempt", {
				requestedUserId: userId,
				requestingUserId: req.user?.id,
				requestingUserRole: req.user?.role,
			});

			res.status(403).json({ error: "Unauthorized to view this user" });
		}
	} catch (error) {
		logger.error(
			`Error fetching user details: ${error instanceof Error ? error.message : "Unknown error"}`,
			{
				stack: error instanceof Error ? error.stack : undefined,
				requestedUserId: userId,
				requestingUserId: req.user?.id,
			},
		);

		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
