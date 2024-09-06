import { Router } from "express";
import type { Request } from "express";
import { PrismaClient, completed_exercises } from "@prisma/client";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
dotenv.config();

const router = Router();
const prisma = new PrismaClient();

// Workouts route
router.get(
	"/programs/:programId/workouts",
	authenticateToken,
	async (req: Request, res) => {
		const { programId } = req.params;

		try {
			const workouts = await prisma.workouts.findMany({
				where: { program_id: Number(programId) },
			});
			res.status(200).json(workouts);
		} catch (error) {
			console.error(error);
			res.status(500).json({ error: "Internal server error" });
		}
	},
);

router.get(
	"/workouts/:workoutId/exercises",
	authenticateToken,
	async (req: Request, res) => {
		const { workoutId } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ error: "User not authenticated" });
		}

		try {
			// Raw SQL query to get the latest completed exercises for each exercise within the workout for the user
			// biome-ignore lint/suspicious/noExplicitAny: <explanation>
			const completedExercises = await prisma.$queryRaw<any[]>`
		  SELECT ce.*, e.id as "exercise_id", e.name as "exercise_name", we."order"
		  FROM completed_exercises ce
		  JOIN (
			SELECT "exercise_id", MAX("completedAt") as latest
			FROM completed_exercises
			WHERE "workout_id" = ${Number.parseInt(workoutId)} AND "user_id" = ${userId}
			GROUP BY "exercise_id"
		  ) latest_ce ON ce."exercise_id" = latest_ce."exercise_id" AND ce."completedAt" = latest_ce.latest
		  JOIN exercises e ON ce."exercise_id" = e.id
		  JOIN workout_exercises we ON ce."exercise_id" = we."exercise_id" AND we."workout_id" = ${Number.parseInt(workoutId)}
		  ORDER BY we."order" ASC
		`;

			if (completedExercises.length > 0) {
				// Transform the completed exercises to match the workout exercises structure
				const transformedExercises = completedExercises.map((ex) => ({
					workout_id: ex.workout_id,
					exercise_id: ex.exercise_id,
					sets: ex.sets,
					reps: ex.reps,
					weight: ex.weight ? Number.parseFloat(ex.weight) : 0,
					order: ex.order,
					exercises: {
						id: ex.exercise_id,
						name: ex.exercise_name,
					},
				}));

				res.status(200).json(transformedExercises);
			} else {
				// Otherwise, return the workout exercises
				const workoutExercises = await prisma.workout_exercises.findMany({
					where: {
						workout_id: Number.parseInt(workoutId),
					},
					include: {
						exercises: true,
					},
					orderBy: {
						order: "asc",
					},
				});

				// Transform workoutExercises to match the structure of completedExercises
				const transformedWorkoutExercises = workoutExercises.map((we) => ({
					workout_id: we.workout_id,
					exercise_id: we.exercise_id,
					sets: we.sets,
					reps: we.reps,
					weight: we.weight
						? Number.parseFloat(we.weight as unknown as string)
						: 0,
					order: we.order,
					exercises: {
						id: we.exercises.id,
						name: we.exercises.name,
					},
				}));

				return res.status(200).json(transformedWorkoutExercises);
			}
		} catch (error) {
			console.error("Error fetching exercises:", error);
			return res.status(500).json({ error: "Internal server error" });
		}
	},
);

router.post(
	"/workouts/completeWorkout",
	authenticateToken,
	async (req, res) => {
		const exerciseData = req.body;

		if (
			!Array.isArray(exerciseData) ||
			exerciseData.some(
				(data) =>
					data.userId == null ||
					data.workoutId == null ||
					data.exerciseId == null ||
					data.sets == null ||
					data.reps == null ||
					data.weight == null,
			)
		) {
			return res.status(400).json({ message: "Invalid data format" });
		}

		try {
			const completedExercises = await Promise.all(
				exerciseData.map(async (data) => {
					return await prisma.completed_exercises.create({
						data: {
							sets: data.sets,
							reps: data.reps,
							weight: data.weight,
							user: {
								connect: {
									id: Number.parseInt(data.userId), // Ensure userId is an integer
								},
							},
							workout: {
								connect: {
									id: Number.parseInt(data.workoutId), // Ensure workoutId is an integer
								},
							},
							exercise: {
								connect: {
									id: Number.parseInt(data.exerciseId), // Ensure exerciseId is an integer
								},
							},
							completedAt: new Date(), // Optional, if you want to set it manually
						},
					});
				}),
			);
			res.status(201).json(completedExercises);
		} catch (error) {
			console.error("Error during database operation:", error);
			res
				.status(500)
				.json({ error: "An error occurred while saving the exercise data." });
		}
	},
);

router.post("/workouts/addworkout", authenticateToken, async (req, res) => {
	const workoutName = req.body.name;
	const programId = Number.parseInt(req.body.programId);

	const program = await prisma.programs.findUnique({
		where: { id: programId },
	});

	if (!program) {
		res.status(404).json({ error: "Program does not exist." });
	}

	try {
		const workout = await prisma.workouts.create({
			data: {
				name: workoutName,
				program_id: programId,
			},
		});

		res.status(201).json({
			message: `You've successfully added a workout to program: ${program?.name}.`,
		});
	} catch (error) {
		console.log(error);
		res
			.status(500)
			.json({ error: "An error occurred while saving the exercise data." });
	}
});

export default router;
