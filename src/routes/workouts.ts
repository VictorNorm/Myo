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
	timestamp: Date;
	source: string;
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
			console.log("Authentication failed for workout request");
			return res.status(401).json({ error: "User not authenticated" });
		}

		try {
			// Validate workoutId
			if (!workoutId || Number.isNaN(Number(workoutId))) {
				console.error("Invalid workoutId:", workoutId);
				return res.status(400).json({ error: "Invalid workout ID" });
			}

			const workoutExercises = await prisma.workout_exercises.findMany({
				where: {
					workout_id: Number.parseInt(workoutId),
				},
				include: {
					exercises: true,
				},
				orderBy: { order: "asc" },
			});

			if (!workoutExercises.length) {
				console.log("No exercises found for workout:", workoutId);
				return res.status(200).json([]); // Return empty array instead of error object
			}

			const completedExercises = await prisma.$queryRaw<CompletedExercise[]>`
			WITH LatestValues AS (
			  -- Get latest completed exercises
			  SELECT 
				ce.exercise_id,
				ce.sets,
				ce.reps,
				ce.weight,
				ce."completedAt" as timestamp,
				'completed' as source
			  FROM completed_exercises ce
			  JOIN (
				SELECT exercise_id, MAX("completedAt") as latest_completion
				FROM completed_exercises
				WHERE workout_id = ${Number.parseInt(workoutId)}
				AND user_id = ${userId}
				GROUP BY exercise_id
			  ) latest ON ce.exercise_id = latest.exercise_id 
			  AND ce."completedAt" = latest.latest_completion
		  
			  UNION ALL
		  
			  -- Get workout exercises
			  SELECT 
				we.exercise_id,
				we.sets,
				we.reps,
				we.weight,
				we."updatedAt" as timestamp,
				'workout' as source
			  FROM workout_exercises we
			  WHERE we.workout_id = ${Number.parseInt(workoutId)}
			)
			SELECT DISTINCT ON (exercise_id) *
			FROM LatestValues
			ORDER BY exercise_id, timestamp DESC
		  `;

			const latestValuesMap = new Map(
				completedExercises.map((ce) => [ce.exercise_id, ce]),
			);

			// Create a map of completed exercises
			const completedExerciseMap = new Map(
				completedExercises.map((ce) => [ce.exercise_id, ce]),
			);

			// Merge the data with detailed logging
			const mergedExercises = workoutExercises.map((we) => {
				const latest = latestValuesMap.get(we.exercise_id);
				return {
					workout_id: we.workout_id,
					exercise_id: we.exercise_id,
					sets: latest ? latest.sets : we.sets,
					reps: latest ? latest.reps : we.reps,
					weight: latest ? Number(latest.weight) : Number(we.weight) || 0,
					order: we.order,
					exercises: {
						id: we.exercises.id,
						name: we.exercises.name,
					},
					lastCompleted:
						latest?.source === "completed" ? latest.timestamp : null,
					superset_with: null,
				};
			});

			console.log("Fetching supersets...");
			const supersets = await prisma.supersets.findMany({
				where: { workout_id: Number.parseInt(workoutId) },
				orderBy: { order: "asc" },
			});

			console.log(`Found ${supersets.length} supersets`);

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

			console.log("Sending response with", finalExercises.length, "exercises");
			return res.status(200).json(finalExercises);
		} catch (error) {
			console.error("Detailed error in workout exercises endpoint:", {
				error,
				stack: error instanceof Error ? error.stack : undefined,
				workoutId,
				userId,
				timestamp: new Date().toISOString(),
			});

			return res.status(500).json({
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			});
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
