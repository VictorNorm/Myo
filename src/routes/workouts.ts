import { Router } from "express";
import type { Request } from "express";
import { PrismaClient, completed_exercises } from "@prisma/client";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
dotenv.config();

const router = Router();
const prisma = new PrismaClient();

interface CompletedExercise {
	workout_id: number;
	exercise_id: number;
	sets: number;
	reps: number;
	weight: string | null;
	order: number;
	exercise_name: string;
	completedAt: string;
}

interface Exercise {
	workout_id: number;
	exercise_id: number;
	sets: number;
	reps: number;
	weight: number;
	order: number;
	exercises: {
		id: number;
		name: string;
	};
	superset_with: number | null;
}

interface SupersetMap {
	[key: number]: number;
}

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
			// 1. Get the base workout exercises (template data)
			const workoutExercises = await prisma.workout_exercises.findMany({
				where: {
					workout_id: Number.parseInt(workoutId),
				},
				include: {
					exercises: true,
				},
				orderBy: { order: "asc" },
			});

			// 2. Get the latest completed exercises
			const completedExercises = await prisma.$queryRaw<CompletedExercise[]>`
		  SELECT ce.*
		  FROM completed_exercises ce
		  JOIN (
			SELECT exercise_id, MAX("completedAt") as latest_completion
			FROM completed_exercises
			WHERE workout_id = ${Number.parseInt(workoutId)}
			AND user_id = ${userId}
			GROUP BY exercise_id
		  ) latest ON ce.exercise_id = latest.exercise_id 
		  AND ce."completedAt" = latest.latest_completion
		  WHERE ce.workout_id = ${Number.parseInt(workoutId)}
		`;

			// Create a map of completed exercises
			const completedExerciseMap = new Map(
				completedExercises.map((ce) => [ce.exercise_id, ce]),
			);

			// 3. Merge the data, using completed data only if it's non-zero
			const mergedExercises = workoutExercises.map((we) => {
				const completed = completedExerciseMap.get(we.exercise_id);

				// Log for debugging
				console.log("Processing exercise:", {
					exercise_id: we.exercise_id,
					template: { sets: we.sets, reps: we.reps, weight: we.weight },
					completed: completed
						? {
								sets: completed.sets,
								reps: completed.reps,
								weight: completed.weight,
							}
						: null,
				});

				return {
					workout_id: we.workout_id,
					exercise_id: we.exercise_id,
					// Use completed values only if they're non-zero, otherwise use template values
					sets: completed && completed.sets > 0 ? completed.sets : we.sets,
					reps: completed && completed.reps > 0 ? completed.reps : we.reps,
					weight:
						completed?.weight && Number(completed.weight) > 0
							? Number(completed.weight)
							: we.weight
								? Number(we.weight)
								: 0,
					order: we.order,
					exercises: {
						id: we.exercises.id,
						name: we.exercises.name,
					},
					lastCompleted: completed?.completedAt ?? null,
					superset_with: null,
				};
			});

			// 4. Handle supersets
			const supersets = await prisma.supersets.findMany({
				where: { workout_id: Number.parseInt(workoutId) },
				orderBy: { order: "asc" },
			});

			const supersetMap = supersets.reduce(
				(acc, superset) => {
					acc[superset.first_exercise_id] = superset.second_exercise_id;
					acc[superset.second_exercise_id] = superset.first_exercise_id;
					return acc;
				},
				{} as Record<number, number>,
			);

			const finalExercises = mergedExercises.map((exercise) => ({
				...exercise,
				superset_with: supersetMap[exercise.exercise_id] || null,
			}));

			return res.status(200).json(finalExercises);
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
