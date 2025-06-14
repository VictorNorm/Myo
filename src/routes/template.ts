import { Router, type Request } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
import prisma from "../services/db";
import logger from "../services/logger";
dotenv.config();

const router = Router();

// Define interfaces outside the route handler
interface ExerciseBaselineFromDB {
	exercise_id: number;
	user_id: number;
	program_id: number;
	sets: number;
	reps: number;
	weight: Decimal;
	id: number;
	createdAt: Date;
	updatedAt?: Date;
}

interface CompletedExerciseFromDB {
	exercise_id: number;
	sets: number;
	reps: number;
	weight: string;
}

router.get(
	"/workouts/:workoutId/template",
	authenticateToken,
	async (req: Request, res) => {
		const { workoutId } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			logger.warn(
				"Attempted to access workout template without authentication",
			);
			return res.status(401).json({ error: "User not authenticated" });
		}

		try {
			// First, get the workout with program details to determine the program type
			const workout = await prisma.workouts.findUnique({
				where: { id: Number(workoutId) },
				include: {
					programs: {
						select: {
							id: true,
							name: true,
							programType: true,
							goal: true,
						},
					},
				},
			});

			if (!workout) {
				logger.warn("Workout not found for template", {
					workoutId: Number(workoutId),
					userId,
				});
				return res.status(404).json({ error: "Workout not found" });
			}

			const programType = workout.programs?.programType || "MANUAL";
			const programId = workout.program_id;

			// Early return if no program is associated
			if (!programId) {
				logger.warn("Workout not associated with a program", {
					workoutId: Number(workoutId),
					userId,
				});
				return res
					.status(400)
					.json({ error: "Workout is not associated with a program" });
			}

			// Get workout exercises with their details
			const workoutExercises = await prisma.workout_exercises.findMany({
				where: {
					workout_id: Number(workoutId),
				},
				include: {
					exercises: {
						select: {
							id: true,
							name: true,
							equipment: true,
							category: true,
							videoUrl: true,
						},
					},
				},
				orderBy: {
					order: "asc",
				},
			});
			logger.warn(
				'🔍 Backend - Sample exercise with video URL:', workoutExercises[0]?.exercises,
			);
			logger.warn('🔍 Backend - Total exercises found:', workoutExercises.length);
			logger.warn('🔍 Backend - First exercise raw:', workoutExercises[0]);

			// Get supersets for this workout
			const supersets = await prisma.supersets.findMany({
				where: {
					workout_id: Number(workoutId),
				},
			});

			// Create a map of exercise_id to its superset partner
			const supersetMap: Record<number, number> = {};
			for (const superset of supersets) {
				supersetMap[superset.first_exercise_id] = superset.second_exercise_id;
				supersetMap[superset.second_exercise_id] = superset.first_exercise_id;
			}

			// Initialize with empty arrays
			let exerciseBaselines: ExerciseBaselineFromDB[] = [];
			let lastCompletedExercises: CompletedExerciseFromDB[] = [];

			logger.debug("Processing workout template", {
				workoutId: Number(workoutId),
				userId,
				programId,
				programType,
				exerciseCount: workoutExercises.length,
				supersetCount: supersets.length,
			});

			// Get user-specific baselines for AUTOMATED programs
			if (programType === "AUTOMATED") {
				exerciseBaselines = await prisma.exercise_baselines.findMany({
					where: {
						user_id: Number(userId),
						program_id: programId,
						exercise_id: {
							in: workoutExercises.map((we) => we.exercise_id),
						},
					},
				});

				logger.debug("Retrieved exercise baselines for automated program", {
					baselineCount: exerciseBaselines.length,
					workoutId: Number(workoutId),
					programId,
				});
			}

			// Create a map of exercise baselines for quick lookup
			const baselineMap = new Map(
				exerciseBaselines.map((baseline) => [baseline.exercise_id, baseline]),
			);

			// For MANUAL programs, get the user's most recent completed exercises
			if (programType === "MANUAL") {
				// This query gets the most recent completed exercise for each exercise_id
				lastCompletedExercises = await prisma.$queryRaw`
				SELECT DISTINCT ON (exercise_id)
				  exercise_id,
				  sets,
				  reps,
				  weight
				FROM completed_exercises
				WHERE user_id = ${Number(userId)}
				AND workout_id = ${Number(workoutId)}
				ORDER BY exercise_id, "completedAt" DESC
			  `;

				logger.debug("Retrieved last completed exercises for manual program", {
					completedExerciseCount: lastCompletedExercises.length,
					workoutId: Number(workoutId),
					userId,
				});
			}

			// Create a map of last completed exercises for quick lookup
			const lastCompletedMap = new Map(
				lastCompletedExercises.map((completed) => [
					completed.exercise_id,
					completed,
				]),
			);

			// Format the exercise data, prioritizing baselines for AUTOMATED and completed exercises for MANUAL
			const templateData = workoutExercises.map((exercise) => {
				let sets = exercise.sets;
				let reps = exercise.reps;
				let weight = exercise.weight;
				let weightValue: number; // Define a separate variable for numerical value
				let source = "template";

				// For AUTOMATED programs, use baseline data if available
				if (programType === "AUTOMATED") {
					const baseline = baselineMap.get(exercise.exercise_id);
					if (baseline) {
						sets = baseline.sets;
						reps = baseline.reps;
						// Keep the original weight as Decimal
						weight = baseline.weight;
						// Store numerical value separately for the response
						weightValue = Number(baseline.weight);
						source = "baseline";
					} else {
						weightValue = Number(weight);
					}
				}
				// For MANUAL programs, use the last completed values if available
				else {
					const lastCompleted = lastCompletedMap.get(exercise.exercise_id);
					if (lastCompleted) {
						sets = lastCompleted.sets;
						reps = lastCompleted.reps;
						// Keep original weight and create numerical representation
						weight = new Prisma.Decimal(lastCompleted.weight);
						weightValue = Number(lastCompleted.weight);
						source = "completed";
					} else {
						weightValue = Number(weight);
					}
				}

				return {
					workout_id: exercise.workout_id,
					exercise_id: exercise.exercise_id,
					sets,
					reps,
					weight: weightValue, // Use the numerical value in the response
					order: exercise.order,
					exercises: {
						...exercise.exercises
					},
					equipment_type: exercise.exercises.equipment,
					is_compound: exercise.exercises.category === "COMPOUND",
					superset_with: supersetMap[exercise.exercise_id] || null,
					source,
				};
			});

			logger.debug("Successfully built workout template", {
				workoutId: Number(workoutId),
				userId,
				programId,
				programType,
				exerciseCount: templateData.length,
				baselineCount: exerciseBaselines.length,
				lastCompletedCount: lastCompletedExercises.length,
			});

			// Return the structured response
			return res.status(200).json({
				exercises: templateData,
				programType,
				programId: workout.program_id,
				programName: workout.programs?.name,
				programGoal: workout.programs?.goal || "HYPERTROPHY",
			});
		} catch (error) {
			logger.error(
				`Error fetching workout template: ${error instanceof Error ? error.message : "Unknown error"}`,
				{
					stack: error instanceof Error ? error.stack : undefined,
					workoutId: Number(req.params.workoutId),
					userId: req.user?.id,
				},
			);

			return res.status(500).json({
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
				stack:
					process.env.NODE_ENV === "development" && error instanceof Error
						? error.stack
						: undefined,
			});
		}
	},
);

export default router;
