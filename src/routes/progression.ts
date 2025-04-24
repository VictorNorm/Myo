import { Router, type Request } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
dotenv.config();
import prisma from "../services/db";

const router = Router();

// Get progression history for a specific exercise in a workout
router.get(
	"/workouts/:workoutId/exercises/:exerciseId/progression",
	authenticateToken,
	async (req: Request, res) => {
		const { workoutId, exerciseId } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ error: "User not authenticated" });
		}

		try {
			// First get the program_id for this workout
			const workout = await prisma.workouts.findUnique({
				where: { id: Number(workoutId) },
				select: { program_id: true },
			});

			if (!workout || !workout.program_id) {
				return res
					.status(404)
					.json({ error: "Workout not found or has no program" });
			}

			const programId = workout.program_id;

			// Get the exercise baseline
			const baseline = await prisma.exercise_baselines.findUnique({
				where: {
					exercise_id_user_id_program_id: {
						exercise_id: Number(exerciseId),
						user_id: Number(userId),
						program_id: programId,
					},
				},
			});

			// Get progression history
			const progressionHistory = await prisma.progression_history.findMany({
				where: {
					exercise_id: Number(exerciseId),
					user_id: Number(userId),
					program_id: workout.program_id,
				},
				orderBy: {
					createdAt: "desc",
				},
				take: 10, // Limit to last 10 progressions
			});

			// Get current template values
			const currentTemplate = await prisma.workout_exercises.findUnique({
				where: {
					workout_id_exercise_id: {
						workout_id: Number(workoutId),
						exercise_id: Number(exerciseId),
					},
				},
				select: {
					sets: true,
					reps: true,
					weight: true,
				},
			});

			// Get last completed exercise
			const lastCompleted = await prisma.completed_exercises.findFirst({
				where: {
					exercise_id: Number(exerciseId),
					user_id: Number(userId),
					workout: {
						program_id: workout.program_id,
					},
				},
				orderBy: {
					completedAt: "desc",
				},
				select: {
					sets: true,
					reps: true,
					weight: true,
					rating: true,
					completedAt: true,
				},
			});

			const response = {
				baseline: baseline
					? {
							sets: baseline.sets,
							reps: baseline.reps,
							weight: baseline.weight,
						}
					: null,
				current: currentTemplate
					? {
							sets: currentTemplate.sets,
							reps: currentTemplate.reps,
							weight: currentTemplate.weight,
						}
					: null,
				lastCompleted: lastCompleted
					? {
							sets: lastCompleted.sets,
							reps: lastCompleted.reps,
							weight: lastCompleted.weight,
							rating: lastCompleted.rating,
							completedAt: lastCompleted.completedAt,
						}
					: null,
				progressionHistory,
			};

			return res.status(200).json(response);
		} catch (error) {
			console.error("Error fetching progression history:", error);
			return res.status(500).json({
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
);

// Get all progression history for a workout
router.get(
	"/workouts/:workoutId/progression",
	authenticateToken,
	async (req: Request, res) => {
		const { workoutId } = req.params;
		const userId = req.user?.id;

		if (!userId) {
			return res.status(401).json({ error: "User not authenticated" });
		}

		try {
			// Get workout details with exercises
			const workout = await prisma.workouts.findUnique({
				where: { id: Number(workoutId) },
				include: {
					workout_exercises: {
						include: {
							exercises: true,
						},
					},
				},
			});

			if (!workout || !workout.program_id) {
				return res
					.status(404)
					.json({ error: "Workout not found or has no program" });
			}

			const programId = workout.program_id;

			// Get progression data for each exercise
			const progressionData = await Promise.all(
				workout.workout_exercises.map(async (exercise) => {
					const baseline = await prisma.exercise_baselines.findUnique({
						where: {
							exercise_id_user_id_program_id: {
								exercise_id: exercise.exercise_id,
								user_id: Number(userId),
								program_id: programId,
							},
						},
					});

					const lastCompleted = await prisma.completed_exercises.findFirst({
						where: {
							exercise_id: exercise.exercise_id,
							user_id: Number(userId),
							workout: {
								program_id: workout.program_id,
							},
						},
						orderBy: {
							completedAt: "desc",
						},
					});

					return {
						exercise_id: exercise.exercise_id,
						name: exercise.exercises.name,
						baseline: baseline
							? {
									sets: baseline.sets,
									reps: baseline.reps,
									weight: baseline.weight,
								}
							: null,
						current: {
							sets: exercise.sets,
							reps: exercise.reps,
							weight: exercise.weight,
						},
						lastCompleted: lastCompleted
							? {
									sets: lastCompleted.sets,
									reps: lastCompleted.reps,
									weight: lastCompleted.weight,
									rating: lastCompleted.rating,
									completedAt: lastCompleted.completedAt,
								}
							: null,
					};
				}),
			);

			return res.status(200).json(progressionData);
		} catch (error) {
			console.error("Error fetching workout progression:", error);
			return res.status(500).json({
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
);

export default router;
