import { Router } from "express";
import type { Request } from "express";
import { PrismaClient, completed_exercises } from "@prisma/client";
import {
	calculateProgression,
	type ExerciseData,
	type UserEquipmentSettings,
} from "fitness-progression-calculator";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
import type { Decimal } from "@prisma/client/runtime/library";
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

function toNumber(
	value: Decimal | null | undefined,
	defaultValue: number,
): number {
	return value ? Number(value) : defaultValue;
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
					data.weight == null ||
					data.rating == null, // Required for AUTOMATED programs
			)
		) {
			return res.status(400).json({ message: "Invalid data format" });
		}

		try {
			// Get the program details including type and goal
			const workout = await prisma.workouts.findUnique({
				where: {
					id: Number(exerciseData[0].workoutId),
				},
				include: {
					programs: true,
				},
			});

			if (!workout || !workout.program_id) {
				throw new Error("Workout not found or not associated with a program");
			}

			const programId = workout.program_id;
			const isAutomated = workout.programs?.programType === "AUTOMATED";
			const programGoal = workout.programs?.goal || "HYPERTROPHY";

			const result = await prisma.$transaction(async (prisma) => {
				const completedExercises = await Promise.all(
					exerciseData.map(async (data) => {
						// Get exercise details
						const exercise = await prisma.exercises.findUnique({
							where: { id: Number(data.exerciseId) },
						});

						if (!exercise)
							throw new Error(`Exercise ${data.exerciseId} not found`);

						// Save completed exercise
						const completed = await prisma.completed_exercises.create({
							data: {
								sets: data.sets,
								reps: data.reps,
								weight: data.weight,
								rating: data.rating,
								user: { connect: { id: Number(data.userId) } },
								workout: { connect: { id: Number(data.workoutId) } },
								exercise: { connect: { id: Number(data.exerciseId) } },
								completedAt: new Date(),
							},
						});

						// Only calculate progression for AUTOMATED programs
						if (isAutomated) {
							// Get user settings from database
							const userSettings = await prisma.user_settings.findUnique({
								where: {
									user_id: Number(data.userId),
								},
							});

							// Convert database settings to UserEquipmentSettings format
							const equipmentSettings: UserEquipmentSettings = {
								barbellIncrement: toNumber(userSettings?.barbellIncrement, 2.5),
								dumbbellIncrement: toNumber(
									userSettings?.dumbbellIncrement,
									2.0,
								),
								cableIncrement: toNumber(userSettings?.cableIncrement, 2.5),
								machineIncrement: toNumber(userSettings?.machineIncrement, 5.0),
								experienceLevel: userSettings?.experienceLevel || "BEGINNER",
							};

							const exerciseData: ExerciseData = {
								sets: data.sets,
								reps: data.reps,
								weight: Number(data.weight),
								rating: data.rating,
								equipment_type: exercise.equipment,
								is_compound: exercise.category === "COMPOUND",
								exercise_name: exercise.name,
							};

							const progressionResult = calculateProgression(
								exerciseData,
								programGoal === "STRENGTH" ? "STRENGTH" : "HYPERTROPHY",
								equipmentSettings, // Add this parameter
							);
						}

						return completed;
					}),
				);

				// Handle exercise baselines (for first-time exercises)
				for (const data of exerciseData) {
					const existingBaseline = await prisma.exercise_baselines.findUnique({
						where: {
							exercise_id_user_id_program_id: {
								exercise_id: Number(data.exerciseId),
								user_id: Number(data.userId),
								program_id: programId,
							},
						},
					});

					if (!existingBaseline) {
						await prisma.exercise_baselines.create({
							data: {
								exercise_id: Number(data.exerciseId),
								user_id: Number(data.userId),
								program_id: programId,
								sets: data.sets,
								reps: data.reps,
								weight: data.weight,
							},
						});
					}
				}

				await prisma.workout_progress.upsert({
					where: {
						user_id_program_id_workout_id: {
							user_id: Number(exerciseData[0].userId),
							program_id: programId,
							workout_id: Number(exerciseData[0].workoutId),
						},
					},
					create: {
						user_id: Number(exerciseData[0].userId),
						program_id: programId,
						workout_id: Number(exerciseData[0].workoutId),
						completed_at: new Date(),
						next_scheduled_at: null,
					},
					update: {
						completed_at: new Date(),
						next_scheduled_at: null,
						updated_at: new Date(), // Update the updated_at timestamp
					},
				});

				return completedExercises;
			});

			res.status(201).json(result);
		} catch (error) {
			console.error("Error during database operation:", error);
			res.status(500).json({
				error: "An error occurred while saving the exercise data.",
				message: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
);

// Add this right after your /workouts/completeWorkout route

router.post("/workouts/rate-exercise", authenticateToken, async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			return res.status(401).json({ error: "Unauthorized" });
		}

		const parsedUserId =
			typeof userId === "string" ? Number.parseInt(userId, 10) : userId;

		const {
			exerciseId,
			workoutId,
			sets,
			reps,
			weight,
			rating,
			equipment_type,
			is_compound,
			useAdaptiveIncrements = true, // Default to true if not provided
		} = req.body;

		// Get the exercise details
		const exercise = await prisma.exercises.findUnique({
			where: { id: exerciseId },
		});

		if (!exercise) {
			return res.status(404).json({ error: "Exercise not found" });
		}

		// Find current program
		const workout = await prisma.workouts.findUnique({
			where: { id: workoutId },
			include: { programs: true },
		});

		if (!workout || !workout.program_id) {
			return res
				.status(404)
				.json({ error: "Workout not found or not associated with a program" });
		}

		const programId = workout.program_id;
		const programGoal = workout.programs?.goal || "HYPERTROPHY";

		// Get user settings
		const userSettings = await prisma.user_settings.findUnique({
			where: { user_id: parsedUserId },
		});

		// If settings don't exist, create default settings
		const settings =
			userSettings ||
			(await prisma.user_settings.create({
				data: {
					user_id: parsedUserId,
					experienceLevel: "BEGINNER",
					barbellIncrement: 2.5,
					dumbbellIncrement: 2.0,
					cableIncrement: 2.5,
					machineIncrement: 5.0,
					useMetric: true,
					darkMode: true,
				},
			}));

		// Record completed exercise with rating
		const completedExercise = await prisma.completed_exercises.create({
			data: {
				exercise_id: exerciseId,
				user_id: parsedUserId,
				workout_id: workoutId,
				sets,
				reps,
				weight,
				rating,
			},
		});

		if (!completedExercise) {
			return res
				.status(500)
				.json({ error: "Failed to record exercise completion" });
		}

		// Map settings to the format expected by the progression calculator
		const equipmentSettings: UserEquipmentSettings = {
			barbellIncrement: toNumber(settings.barbellIncrement, 2.5),
			dumbbellIncrement: toNumber(settings.dumbbellIncrement, 2.0),
			cableIncrement: toNumber(settings.cableIncrement, 2.5),
			machineIncrement: toNumber(settings.machineIncrement, 5.0),
			experienceLevel: settings.experienceLevel || "BEGINNER",
		};

		// If not using adaptive increments, use fixed increments
		if (!useAdaptiveIncrements) {
			// Get the fixed increment for the equipment type
			let fixedIncrement: number;
			switch (equipment_type) {
				case "BARBELL":
					fixedIncrement = toNumber(settings.barbellIncrement, 2.5);
					break;
				case "DUMBBELL":
					fixedIncrement = toNumber(settings.dumbbellIncrement, 2.0);
					break;
				case "CABLE":
					fixedIncrement = toNumber(settings.cableIncrement, 2.5);
					break;
				case "MACHINE":
					fixedIncrement = toNumber(settings.machineIncrement, 5.0);
					break;
				case "BODYWEIGHT":
					fixedIncrement = toNumber(settings.dumbbellIncrement, 2.0);
					break;
				default:
					fixedIncrement = 2.5;
			}

			// Override all increment settings with the fixed increment
			equipmentSettings.barbellIncrement = fixedIncrement;
			equipmentSettings.dumbbellIncrement = fixedIncrement;
			equipmentSettings.cableIncrement = fixedIncrement;
			equipmentSettings.machineIncrement = fixedIncrement;
		}

		// Prepare exercise data for progression calculation
		const exerciseData: ExerciseData = {
			sets,
			reps,
			weight: Number(weight),
			rating,
			equipment_type,
			is_compound,
			exercise_name: exercise.name,
		};

		// Calculate progression
		const progressionResult = calculateProgression(
			exerciseData,
			programGoal === "STRENGTH" ? "STRENGTH" : "HYPERTROPHY",
			equipmentSettings,
		);

		// Record progression history
		await prisma.progression_history.create({
			data: {
				exercise_id: exerciseId,
				user_id: parsedUserId,
				program_id: programId,
				oldWeight: weight,
				newWeight: progressionResult.newWeight,
				oldReps: reps,
				newReps: progressionResult.newReps,
				reason: "Rating-based progression",
			},
		});

		// Update exercise baseline for next workout
		await prisma.exercise_baselines.upsert({
			where: {
				exercise_id_user_id_program_id: {
					exercise_id: exerciseId,
					user_id: parsedUserId,
					program_id: programId,
				},
			},
			update: {
				weight: progressionResult.newWeight,
				reps: progressionResult.newReps,
				sets,
			},
			create: {
				exercise_id: exerciseId,
				user_id: parsedUserId,
				program_id: programId,
				weight: progressionResult.newWeight,
				reps: progressionResult.newReps,
				sets,
			},
		});

		// Return the progression result
		res.json({
			success: true,
			exerciseId,
			oldWeight: Number(weight),
			newWeight: progressionResult.newWeight,
			oldReps: reps,
			newReps: progressionResult.newReps,
			adaptiveIncrements: useAdaptiveIncrements,
		});
	} catch (error) {
		console.error("Error rating exercise:", error);
		res.status(500).json({
			error: "Internal server error",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

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
