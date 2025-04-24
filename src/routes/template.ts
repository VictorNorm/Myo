import { Router, type Request } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
import prisma from "../services/db";
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
				return res.status(404).json({ error: "Workout not found" });
			}

			const programType = workout.programs?.programType || "MANUAL";
			const programId = workout.program_id;

			// Early return if no program is associated
			if (!programId) {
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
						},
					},
				},
				orderBy: {
					order: "asc",
				},
			});

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
			}

			// Create a map of exercise baselines for quick lookup
			const baselineMap = new Map(
				exerciseBaselines.map((baseline) => [baseline.exercise_id, baseline]),
			);

			// For MANUAL programs, get the user's most recent completed exercises
			if (programType === "MANUAL") {
				// This query gets the most recent completed exercise for each exercise_id
				lastCompletedExercises = await prisma.$queryRaw<
					CompletedExerciseFromDB[]
				>`
					WITH LatestCompletions AS (
						SELECT 
							ce.exercise_id,
							MAX(ce."completedAt") as latest_completion
						FROM completed_exercises ce
						WHERE ce.user_id = ${Number(userId)}
						AND ce.workout_id = ${Number(workoutId)}
						GROUP BY ce.exercise_id
					)
					SELECT 
						ce.exercise_id,
						ce.sets,
						ce.reps,
						ce.weight
					FROM completed_exercises ce
					JOIN LatestCompletions lc ON ce.exercise_id = lc.exercise_id AND ce."completedAt" = lc.latest_completion
					WHERE ce.user_id = ${Number(userId)}
				`;
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
						id: exercise.exercises.id,
						name: exercise.exercises.name,
						equipment: exercise.exercises.equipment,
						category: exercise.exercises.category,
					},
					equipment_type: exercise.exercises.equipment,
					is_compound: exercise.exercises.category === "COMPOUND",
					superset_with: supersetMap[exercise.exercise_id] || null,
					source,
				};
			});

			// Add debugging info
			console.log(
				`Template for workout ${workoutId}, program type: ${programType}`,
			);
			console.log(
				`Found ${exerciseBaselines.length} baselines, ${lastCompletedExercises.length} completed exercises`,
			);

			// Return the structured response
			return res.status(200).json({
				exercises: templateData,
				programType,
				programId: workout.program_id,
				programName: workout.programs?.name,
				programGoal: workout.programs?.goal || "HYPERTROPHY",
			});
		} catch (error) {
			console.error("Error fetching workout template:", error);
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
