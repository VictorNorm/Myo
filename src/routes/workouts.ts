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
import prisma from "../services/db";
import logger from "../services/logger";
dotenv.config();

const router = Router();

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

// Workouts route - optimized to reduce DB queries and handle connection issues
router.get(
	"/programs/:programId/workouts",
	authenticateToken,
	async (req: Request, res) => {
		const { programId } = req.params;
		const currentUser = req.user;

		if (!currentUser) {
			logger.warn("Attempted to access workouts without authentication");
			return res.status(401).json({ error: "User not authenticated" });
		}

		const parsedProgramId = Number(programId);
		if (Number.isNaN(parsedProgramId)) {
			logger.warn("Invalid program ID format", { programId });
			return res.status(400).json({ error: "Invalid program ID format" });
		}

		// ADMIN fast path - admins can access any program's workouts
		const isAdmin = currentUser.role === "ADMIN";

		try {
			// Set a query timeout
			const queryTimeout = setTimeout(() => {
				logger.warn("Workouts fetch query timeout", {
					programId: parsedProgramId,
					userId: currentUser.id,
				});
			}, 5000);

			// Optimized approach: Get program and workouts in one transaction
			// This reduces database roundtrips and chances of connection issues
			const [program, workouts] = await prisma.$transaction([
				// Get the program with minimal data needed
				prisma.programs.findUnique({
					where: { id: parsedProgramId },
					select: { id: true, userId: true }, // Only select what we need
				}),

				// Get workouts conditionally based on admin status
				prisma.workouts.findMany({
					where: {
						program_id: parsedProgramId,
						// Only include this condition if not admin, to optimize the query
						...(isAdmin ? {} : { programs: { userId: currentUser.id } }),
					},
					orderBy: {
						id: "asc", // Consistent ordering
					},
					select: {
						id: true,
						name: true,
						program_id: true,
						// Removed createdAt and updatedAt as they don't exist in the schema
					},
				}),
			]);

			clearTimeout(queryTimeout);

			// Program doesn't exist or isn't accessible
			if (!program) {
				logger.warn("Program not found for workouts request", {
					programId: parsedProgramId,
					userId: currentUser.id,
				});
				return res.status(404).json({ error: "Program not found" });
			}

			// Authorization check only if not admin (admins already get all workouts)
			if (!isAdmin && program.userId !== currentUser.id) {
				logger.warn("Unauthorized access attempt to program workouts", {
					programId: parsedProgramId,
					programOwnerId: program.userId,
					requestUserId: currentUser.id,
				});
				return res.status(403).json({
					error: "Not authorized to access this program's workouts",
				});
			}

			logger.debug("Fetched workouts for program", {
				programId: parsedProgramId,
				userId: currentUser.id,
				workoutCount: workouts.length,
			});

			res.status(200).json(workouts);
		} catch (error) {
			logger.error(
				`Error fetching program workouts: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					programId: parsedProgramId,
					userId: currentUser?.id,
				},
			);
			return res.status(500).json({ error: "Internal server error" });
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
			logger.warn(
				"Attempted to access workout exercises without authentication",
			);
			return res.status(401).json({ error: "User not authenticated" });
		}

		try {
			// Validate workoutId
			if (!workoutId || Number.isNaN(Number(workoutId))) {
				logger.warn("Invalid workout ID format", { workoutId, userId });
				return res.status(400).json({ error: "Invalid workout ID" });
			}

			const parsedWorkoutId = Number.parseInt(workoutId);

			const workoutExercises = await prisma.workout_exercises.findMany({
				where: {
					workout_id: parsedWorkoutId,
				},
				include: {
					exercises: true,
				},
				orderBy: { order: "asc" },
			});

			if (!workoutExercises.length) {
				logger.info("No exercises found for workout", {
					workoutId: parsedWorkoutId,
					userId,
				});
				return res.status(200).json([]); // Return empty array instead of error object
			}

			logger.debug("Fetching completed exercises for workout", {
				workoutId: parsedWorkoutId,
				userId,
				exerciseCount: workoutExercises.length,
			});

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
				WHERE workout_id = ${parsedWorkoutId}
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
			  WHERE we.workout_id = ${parsedWorkoutId}
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

			const supersets = await prisma.supersets.findMany({
				where: { workout_id: parsedWorkoutId },
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

			logger.debug("Successfully built workout exercises response", {
				workoutId: parsedWorkoutId,
				userId,
				exerciseCount: finalExercises.length,
				completedExercisesCount: completedExercises.filter(
					(ce) => ce.source === "completed",
				).length,
				supersetCount: supersets.length,
			});

			return res.status(200).json(finalExercises);
		} catch (error) {
			logger.error(
				`Error fetching workout exercises: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					workoutId,
					userId,
				},
			);

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
		const userId = req.user?.id;

		if (!userId) {
			logger.warn("Attempted to complete workout without authentication");
			return res.status(401).json({ error: "User not authenticated" });
		}

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
					data.rating == null,
			)
		) {
			logger.warn("Invalid data format for workout completion", {
				userId,
				dataLength: exerciseData?.length,
				isArray: Array.isArray(exerciseData),
			});
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
				logger.warn("Workout not found or not associated with a program", {
					workoutId: Number(exerciseData[0].workoutId),
					userId: Number(exerciseData[0].userId),
				});
				throw new Error("Workout not found or not associated with a program");
			}

			const programId = workout.program_id;
			const isAutomated = workout.programs?.programType === "AUTOMATED";
			const programGoal = workout.programs?.goal || "HYPERTROPHY";

			logger.debug("Processing workout completion", {
				workoutId: Number(exerciseData[0].workoutId),
				userId: Number(exerciseData[0].userId),
				programId,
				programType: workout.programs?.programType,
				exerciseCount: exerciseData.length,
				isAutomated,
			});

			// Process each exercise in a transaction
			const result = await prisma.$transaction(async (prisma) => {
				// Array to collect progression results for response
				const progressionResults: {
					exerciseId: number;
					oldWeight: number;
					newWeight: number;
					oldReps: number;
					newReps: number;
					exerciseName: string;
				}[] = [];

				// Process each exercise
				const completedExercises = await Promise.all(
					exerciseData.map(async (data) => {
						// Get exercise details
						const exercise = await prisma.exercises.findUnique({
							where: { id: Number(data.exerciseId) },
						});

						if (!exercise) {
							logger.error("Exercise not found", {
								exerciseId: Number(data.exerciseId),
								workoutId: Number(data.workoutId),
								userId: Number(data.userId),
							});
							throw new Error(`Exercise ${data.exerciseId} not found`);
						}

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

						// Calculate progression for every exercise (needed for next workout template)
						// Get user settings from database
						const userSettings = await prisma.user_settings.findUnique({
							where: {
								user_id: Number(data.userId),
							},
						});

						// Convert database settings to UserEquipmentSettings format
						const equipmentSettings = {
							barbellIncrement: toNumber(userSettings?.barbellIncrement, 2.5),
							dumbbellIncrement: toNumber(userSettings?.dumbbellIncrement, 2.0),
							cableIncrement: toNumber(userSettings?.cableIncrement, 2.5),
							machineIncrement: toNumber(userSettings?.machineIncrement, 5.0),
							experienceLevel: userSettings?.experienceLevel || "BEGINNER",
						};

						// If not using adaptive increments, override with fixed increments
						const useAdaptiveIncrements = data.useAdaptiveIncrements !== false; // Default to true if not specified

						if (!useAdaptiveIncrements) {
							// Get the fixed increment for the equipment type
							let fixedIncrement: number;
							switch (exercise.equipment) {
								case "BARBELL":
									fixedIncrement = toNumber(
										userSettings?.barbellIncrement,
										2.5,
									);
									break;
								case "DUMBBELL":
									fixedIncrement = toNumber(
										userSettings?.dumbbellIncrement,
										2.0,
									);
									break;
								case "CABLE":
									fixedIncrement = toNumber(userSettings?.cableIncrement, 2.5);
									break;
								case "MACHINE":
									fixedIncrement = toNumber(
										userSettings?.machineIncrement,
										5.0,
									);
									break;
								case "BODYWEIGHT":
									fixedIncrement = toNumber(
										userSettings?.dumbbellIncrement,
										2.0,
									);
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

						const exerciseProgressionData = {
							sets: data.sets,
							reps: data.reps,
							weight: Number(data.weight),
							rating: data.rating,
							equipment_type: exercise.equipment,
							is_compound: exercise.category === "COMPOUND",
							exercise_name: exercise.name,
						};

						// Only apply progression to Automated programs, but calculate for all
						const goal = data.programGoal || programGoal;
						const progressionResult = calculateProgression(
							exerciseProgressionData,
							goal === "STRENGTH" ? "STRENGTH" : "HYPERTROPHY",
							equipmentSettings,
						);

						logger.debug("Calculated progression for exercise", {
							exerciseId: Number(data.exerciseId),
							exerciseName: exercise.name,
							oldWeight: Number(data.weight),
							newWeight: progressionResult.newWeight,
							oldReps: data.reps,
							newReps: progressionResult.newReps,
							rating: data.rating,
							isAdaptive: useAdaptiveIncrements,
						});

						// Save progression result for response
						progressionResults.push({
							exerciseId: data.exerciseId,
							oldWeight: Number(data.weight),
							newWeight: progressionResult.newWeight,
							oldReps: data.reps,
							newReps: progressionResult.newReps,
							exerciseName: exercise.name,
						});

						// For AUTOMATED programs, update exercise baseline
						if (isAutomated) {
							// Record progression history
							await prisma.progression_history.create({
								data: {
									exercise_id: Number(data.exerciseId),
									user_id: Number(data.userId),
									program_id: programId,
									oldWeight: data.weight,
									newWeight: progressionResult.newWeight,
									oldReps: data.reps,
									newReps: progressionResult.newReps,
									reason: `Rating-based progression (${data.rating}/5)`,
								},
							});

							// Update exercise baseline for next workout
							await prisma.exercise_baselines.upsert({
								where: {
									exercise_id_user_id_program_id: {
										exercise_id: Number(data.exerciseId),
										user_id: Number(data.userId),
										program_id: programId,
									},
								},
								update: {
									weight: progressionResult.newWeight,
									reps: progressionResult.newReps,
									sets: data.sets,
								},
								create: {
									exercise_id: Number(data.exerciseId),
									user_id: Number(data.userId),
									program_id: programId,
									weight: progressionResult.newWeight,
									reps: progressionResult.newReps,
									sets: data.sets,
								},
							});
						} else {
							// For MANUAL programs, only create baselines if they don't exist
							const existingBaseline =
								await prisma.exercise_baselines.findUnique({
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

						return completed;
					}),
				);

				// Update workout progress
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

				return {
					completedExercises,
					progressionResults,
					programType: workout.programs?.programType || "MANUAL",
				};
			});

			logger.info("Workout completed successfully", {
				workoutId: Number(exerciseData[0].workoutId),
				userId: Number(exerciseData[0].userId),
				programId,
				exerciseCount: exerciseData.length,
				programType: result.programType,
			});

			res.status(201).json(result);
		} catch (error) {
			logger.error(
				`Error completing workout: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					userId: Number(exerciseData?.[0]?.userId),
					workoutId: Number(exerciseData?.[0]?.workoutId),
					exerciseCount: exerciseData?.length,
				},
			);

			res.status(500).json({
				error: "An error occurred while saving the exercise data.",
				message: error instanceof Error ? error.message : "Unknown error",
				stack:
					process.env.NODE_ENV === "development" && error instanceof Error
						? error.stack
						: undefined,
			});
		}
	},
);

// Add this right after your /workouts/completeWorkout route

router.post("/workouts/rate-exercise", authenticateToken, async (req, res) => {
	try {
		const userId = req.user?.id;
		if (!userId) {
			logger.warn("Unauthorized attempt to rate exercise");
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

		logger.debug("Processing exercise rating", {
			userId: parsedUserId,
			exerciseId,
			workoutId,
			rating,
			useAdaptiveIncrements,
		});

		// Get the exercise details
		const exercise = await prisma.exercises.findUnique({
			where: { id: exerciseId },
		});

		if (!exercise) {
			logger.warn("Exercise not found for rating", {
				exerciseId,
				userId: parsedUserId,
			});
			return res.status(404).json({ error: "Exercise not found" });
		}

		// Find current program
		const workout = await prisma.workouts.findUnique({
			where: { id: workoutId },
			include: { programs: true },
		});

		if (!workout || !workout.program_id) {
			logger.warn("Workout not found or not associated with program", {
				workoutId,
				userId: parsedUserId,
			});
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
			logger.error("Failed to record exercise completion", {
				exerciseId,
				userId: parsedUserId,
				workoutId,
			});
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

		logger.debug("Calculated progression from exercise rating", {
			exerciseId,
			userId: parsedUserId,
			oldWeight: Number(weight),
			newWeight: progressionResult.newWeight,
			oldReps: reps,
			newReps: progressionResult.newReps,
			adaptiveIncrements: useAdaptiveIncrements,
		});

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

		logger.info("Exercise rated and progression updated", {
			exerciseId,
			exerciseName: exercise.name,
			userId: parsedUserId,
			rating,
			weightChange: progressionResult.newWeight - Number(weight),
			repsChange: progressionResult.newReps - reps,
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
		logger.error(
			`Error rating exercise: ${error instanceof Error ? error.message : "Unknown error"}`,
			{
				stack: error instanceof Error ? error.stack : undefined,
				userId: req.user?.id,
				exerciseId: req.body?.exerciseId,
				workoutId: req.body?.workoutId,
			},
		);

		res.status(500).json({
			error: "Internal server error",
			message: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

router.post("/workouts/addworkout", authenticateToken, async (req, res) => {
	const workoutName = req.body.name;
	const programId = Number.parseInt(req.body.programId);
	const userId = req.user?.id;

	if (!userId) {
		logger.warn("Unauthorized attempt to add workout");
		return res.status(401).json({ error: "Unauthorized" });
	}

	try {
		const program = await prisma.programs.findUnique({
			where: { id: programId },
		});

		if (!program) {
			logger.warn("Program not found for workout addition", {
				programId,
				userId,
				workoutName,
			});
			return res.status(404).json({ error: "Program does not exist." });
		}

		// Check authorization
		if (program.userId !== userId && req.user?.role !== "ADMIN") {
			logger.warn("Unauthorized program workout addition attempt", {
				programId,
				programOwnerId: program.userId,
				requestUserId: userId,
				userRole: req.user?.role,
			});
			return res
				.status(403)
				.json({ error: "Not authorized to add workouts to this program" });
		}

		const workout = await prisma.workouts.create({
			data: {
				name: workoutName,
				program_id: programId,
			},
		});

		logger.info("Workout added to program", {
			workoutId: workout.id,
			workoutName,
			programId,
			programName: program.name,
			userId,
		});

		res.status(201).json({
			message: `You've successfully added a workout to program: ${program?.name}.`,
		});
	} catch (error) {
		logger.error(
			`Error adding workout: ${error instanceof Error ? error.message : "Unknown error"}`,
			{
				stack: error instanceof Error ? error.stack : undefined,
				workoutName,
				programId,
				userId,
			},
		);

		res
			.status(500)
			.json({ error: "An error occurred while saving the exercise data." });
	}
});

export default router;
