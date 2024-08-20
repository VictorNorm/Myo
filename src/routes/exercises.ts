import { Router, Request } from "express";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
dotenv.config();

const router = Router();
const prisma = new PrismaClient();

router.get("/exercises", authenticateToken, async (req, res) => {
	try {
		const exercises = await prisma.exercises.findMany({
			include: {
				muscle_groups: {
					include: {
						muscle_groups: true,
					},
				},
			},
		});
		res.status(200).json(exercises);
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error" });
	}
});

router.post("/exercises", authenticateToken, async (req, res) => {
	const { name, muscleGroupId } = req.body;

	if (!name || !muscleGroupId) {
		return res.status(400).json({
			error: "Please provide valid name and muscle group of exercise.",
		});
	}

	try {
		const foundExercise = await prisma.exercises.findFirst({
			where: { name: name },
		});

		if (foundExercise) {
			return res.status(400).json({ error: "Exercise already exists." });
		}

		const newExercise = await prisma.exercises.create({
			data: {
				name: name,
				muscle_groups: {
					create: [
						{
							muscle_groups: {
								connect: { id: muscleGroupId },
							},
						},
					],
				},
			},
			include: {
				muscle_groups: {
					include: {
						muscle_groups: true,
					},
				},
			},
		});

		res.status(200).json({
			message: "You've successfully added an exercise.",
			exercise: newExercise,
		});
	} catch (error) {
		console.error("Error creating exercise:", error);
		res
			.status(500)
			.json({ error: "An error occurred while adding the exercise." });
	}
});

router.post("/addExercisesToWorkout", authenticateToken, async (req, res) => {
	try {
		console.log("addExercisesToWorkout reached");
		const { workoutId, exercises } = req.body;

		if (!workoutId || !exercises || !Array.isArray(exercises)) {
			return res.status(400).json({ error: "Invalid input data" });
		}

		const workoutExercises = exercises.map((exercise, index) => ({
			workout_id: workoutId,
			exercise_id: exercise.id,
			sets: exercise.sets,
			reps: exercise.reps,
			weight: exercise.weight,
			order: index,
		}));

		const result = await prisma.workout_exercises.createMany({
			data: workoutExercises,
		});

		res.status(201).json({
			message: "Exercises added to workout successfully",
			count: result.count,
		});
	} catch (error) {
		console.error(error);
		res.status(500).json({ error: "Internal server error" });
	}
});

export default router;
