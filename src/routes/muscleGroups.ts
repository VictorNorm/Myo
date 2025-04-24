import { Router, Request } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
dotenv.config();
import prisma from "../services/db";

const router = Router();

router.get("/muscleGroups", authenticateToken, async (req, res) => {
	try {
		const muscleGroups = await prisma.muscle_groups.findMany();
		res.status(200).json(muscleGroups);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
