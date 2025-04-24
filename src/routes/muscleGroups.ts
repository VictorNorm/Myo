import { Router, Request } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
import logger from "../services/logger";
import prisma from "../services/db";
dotenv.config();

const router = Router();

router.get("/muscleGroups", authenticateToken, async (req, res) => {
	try {
		const muscleGroups = await prisma.muscle_groups.findMany();
		res.status(200).json(muscleGroups);
	} catch (error) {
		logger.error(
			`Error fetching muscle groups: ${error instanceof Error ? error.message : "Unknown error"}`,
			{
				stack: error instanceof Error ? error.stack : undefined,
			},
		);
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
