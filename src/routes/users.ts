import { Router, Request } from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
dotenv.config();

const router = Router();
const prisma = new PrismaClient();

router.get("/users", authenticateToken, async (req, res) => {
	const trainerId = req.body.id;
	// console.log("TRAINER ID:", trainerId);
	// console.log(req.user);

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

		res.status(200).json(userDetails);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.post("/assign-user", authenticateToken, async (req, res) => {
	console.log("req.user", req.user);
	console.log(req.body);

	try {
		if (!req.user) {
			return res
				.status(401)
				.json({ message: "Unauthorized: User not authenticated" });
		}
		const assignedUser = await prisma.users.update({
			where: { id: req.body.userId },
			data: { trainerId: req.user.id },
		});
		res.status(200).json("You've successfully assigned a user.");
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.get("/user/:id", authenticateToken, async (req, res) => {
	const userId = Number.parseInt(req.params.id);

	if (Number.isNaN(userId)) {
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
			return res.status(404).json({ error: "User not found" });
		}

		// Check if the requesting user has permission to view this user
		if (
			req.user &&
			(req.user.role === "ADMIN" ||
				req.user.id === userId ||
				(req.user.role === "TRAINER" && user.trainerId === req.user.id))
		) {
			res.status(200).json(user);
		} else {
			res.status(403).json({ error: "Unauthorized to view this user" });
		}
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
