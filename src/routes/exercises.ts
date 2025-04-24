import { Router, Request } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
import prisma from "../services/db";
import logger from "../services/logger";
dotenv.config();

const router = Router();

// Update the get exercises route to include muscle groups
router.get("/exercises", authenticateToken, async (req, res) => {
	try {
		const exercises = await prisma.exercises.findMany({
			include: {
				muscle_groups: {
					include: {
						muscle_groups: true, // This gets the muscle group details
					},
				},
			},
			orderBy: {
				name: "asc",
			},
		});

		// Reorganize data to group by muscle groups
		const muscleGroups = await prisma.muscle_groups.findMany({
			orderBy: {
				name: "asc",
			},
		});

		const groupedExercises = muscleGroups
			.map((group) => ({
				muscleGroup: group,
				exercises: exercises.filter((exercise) =>
					exercise.muscle_groups.some((mg) => mg.muscle_group_id === group.id),
				),
			}))
			.filter((group) => group.exercises.length > 0); // Only include groups with exercises

		res.status(200).json(groupedExercises);
	} catch (error) {
		logger.error(
			`Error fetching exercises: ${error instanceof Error ? error.message : "Unknown error"}`,
			{
				stack: error instanceof Error ? error.stack : undefined,
			},
		);
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
		logger.error(
			`Error creating exercise: ${error instanceof Error ? error.message : "Unknown error"}`,
			{
				stack: error instanceof Error ? error.stack : undefined,
				exerciseName: name,
			},
		);
		res
			.status(500)
			.json({ error: "An error occurred while adding the exercise." });
	}
});

router.post(
	"/exercises/upsertExercisesToWorkout",
	authenticateToken,
	async (req, res) => {
		try {
			const { workoutId, exercises, supersets } = req.body;

			if (!workoutId || !exercises || !Array.isArray(exercises)) {
				return res.status(400).json({ error: "Invalid input data" });
			}

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

						// Then delete the workout exercises
						await prisma.workout_exercises.deleteMany({
							where: {
								workout_id: workoutId,
							},
						});

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
						}

						return exerciseResults;
					} catch (e) {
						logger.error(
							`Transaction error in upsertExercisesToWorkout: ${e instanceof Error ? e.message : "Unknown error"}`,
							{
								stack: e instanceof Error ? e.stack : undefined,
								workoutId,
							},
						);
						throw e; // Re-throw to trigger transaction rollback
					}
				},
				{
					timeout: 10000,
					isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
				},
			);

			res.status(200).json({
				message: "Exercises and supersets upserted to workout successfully",
				count: result.length,
				data: result,
			});
		} catch (e) {
			// Type guard for Prisma errors
			if (e instanceof Prisma.PrismaClientKnownRequestError) {
				logger.error(`Prisma error in upsertExercisesToWorkout: ${e.message}`, {
					code: e.code,
					meta: e.meta,
					workoutId: req.body.workoutId,
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
				logger.error(
					`Application error in upsertExercisesToWorkout: ${e.message}`,
					{
						stack: e.stack,
						workoutId: req.body.workoutId,
					},
				);
				return res.status(500).json({
					error: "Application error",
					details: e.message,
				});
			}

			// Fallback for unknown error types
			logger.error("Unknown error in upsertExercisesToWorkout", {
				error: e,
				workoutId: req.body.workoutId,
			});
			res.status(500).json({
				error: "Internal server error",
				details: "An unknown error occurred",
			});
		}
	},
);

router.put("/editExercises", authenticateToken, async (req, res) => {
	const { id, name, equipment, category, muscleGroupId } = req.body;

	try {
		// Update the exercise
		const updatedExercise = await prisma.exercises.update({
			where: { id: id },
			data: {
				name,
				equipment,
				category,
				muscle_groups: {
					deleteMany: {}, // Remove existing muscle group connections
					create: [
						{
							muscle_group_id: muscleGroupId,
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

		res.json(updatedExercise);
	} catch (error) {
		logger.error(
			`Error updating exercise: ${error instanceof Error ? error.message : "Unknown error"}`,
			{
				stack: error instanceof Error ? error.stack : undefined,
				exerciseId: id,
			},
		);
		res.status(500).json({ error: "Failed to update exercise" });
	}
});

export default router;
