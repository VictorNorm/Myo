import { Router, Request } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
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
	const { name, muscleGroupId, equipment, category } = req.body; // Add these to destructuring

	if (!name || !muscleGroupId || !equipment || !category) {
		// Add validation
		return res.status(400).json({
			error:
				"Please provide valid name, muscle group, equipment, and category of exercise.",
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
				equipment: equipment, // Add this
				category: category, // Add this
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
			const { workoutId, exercises, supersets } = req.body;
			console.log("Received raw exercise data:", req.body.exercises);

			if (!workoutId || !exercises || !Array.isArray(exercises)) {
				return res.status(400).json({ error: "Invalid input data" });
			}

			console.log(
				"Exercise data before transaction:",
				req.body.exercises.map(
					(ex: { id: number; sets: number; reps: number; weight: number }) => ({
						id: ex.id,
						sets: ex.sets,
						reps: ex.reps,
						weight: ex.weight,
					}),
				),
			);

			// Start a transaction
			const result = await prisma.$transaction(
				async (prisma) => {
					try {
						// First, delete all supersets for this workout
						await prisma.supersets.deleteMany({
							where: {
								workout_id: workoutId,
							},
						});
						console.log("Deleted existing supersets");

						// Then delete the workout exercises
						await prisma.workout_exercises.deleteMany({
							where: {
								workout_id: workoutId,
							},
						});
						console.log("Deleted existing exercises");

						// Create new workout exercises with specified order
						const exerciseResults = await Promise.all(
							exercises.map((exercise, index) =>
								prisma.workout_exercises.create({
									data: {
										workout_id: workoutId,
										exercise_id: exercise.id,
										sets: exercise.sets,
										reps: exercise.reps,
										weight: exercise.weight,
										order: index,
									},
									include: {
										exercises: true,
									},
								}),
							),
						);
						console.log("Created new exercises:", exerciseResults);

						// Create new supersets if any exist
						if (supersets && Array.isArray(supersets) && supersets.length > 0) {
							await Promise.all(
								supersets.map((superset, index) =>
									prisma.supersets.create({
										data: {
											workout_id: workoutId,
											first_exercise_id: superset.first_exercise_id,
											second_exercise_id: superset.second_exercise_id,
											order: index,
										},
									}),
								),
							);
							console.log("Created new supersets");
						}

						return exerciseResults;
					} catch (e) {
						console.error("Transaction error:", e);
						throw e; // Re-throw to trigger transaction rollback
					}
				},
				{
					timeout: 10000,
					isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
				},
			);

			console.log("Created exercise results:", result);

			res.status(200).json({
				message: "Exercises and supersets upserted to workout successfully",
				count: result.length,
				data: result,
			});
		} catch (e) {
			// Type guard for Prisma errors
			if (e instanceof Prisma.PrismaClientKnownRequestError) {
				console.error("Prisma error:", {
					message: e.message,
					code: e.code,
					meta: e.meta,
				});
				return res.status(500).json({
					error: "Database error",
					details: e.message,
					code: e.code,
					meta: e.meta,
				});
			}

			// Type guard for other Error instances
			if (e instanceof Error) {
				console.error("Application error:", e.message);
				return res.status(500).json({
					error: "Application error",
					details: e.message,
				});
			}

			// Fallback for unknown error types
			console.error("Unknown error:", e);
			res.status(500).json({
				error: "Internal server error",
				details: "An unknown error occurred",
			});
		}
	},
);

export default router;
