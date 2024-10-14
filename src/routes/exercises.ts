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

router.post(
	"/upsertExercisesToWorkout",
	authenticateToken,
	async (req, res) => {
		try {
			console.log("upsertExercisesToWorkout reached");
			const { workoutId, exercises, supersets } = req.body;

			if (!workoutId || !exercises || !Array.isArray(exercises)) {
				return res.status(400).json({ error: "Invalid input data" });
			}

			// Start a transaction
			const result = await prisma.$transaction(async (prisma) => {
				// Upsert exercises
				const upsertPromises = exercises.map((exercise, index) =>
					prisma.workout_exercises.upsert({
						where: {
							workout_id_exercise_id: {
								workout_id: workoutId,
								exercise_id: exercise.id,
							},
						},
						update: {
							sets: exercise.sets,
							reps: exercise.reps,
							weight: exercise.weight,
							order: index,
						},
						create: {
							workout_id: workoutId,
							exercise_id: exercise.id,
							sets: exercise.sets,
							reps: exercise.reps,
							weight: exercise.weight,
							order: index,
						},
					}),
				);

				const exerciseResults = await Promise.all(upsertPromises);

				// Delete existing supersets for this workout
				await prisma.supersets.deleteMany({
					where: { workout_id: workoutId },
				});

				// Insert new supersets
				if (supersets && Array.isArray(supersets) && supersets.length > 0) {
					const supersetPromises = supersets.map((superset, index) =>
						prisma.supersets.create({
							data: {
								workout_id: workoutId,
								first_exercise_id: superset.first_exercise_id,
								second_exercise_id: superset.second_exercise_id,
								order: index,
							},
						}),
					);

					await Promise.all(supersetPromises);
				}

				return exerciseResults;
			});

			res.status(200).json({
				message: "Exercises and supersets upserted to workout successfully",
				count: result.length,
			});
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: "Internal server error" });
		}
	},
);

export default router;
