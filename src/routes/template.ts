import { Router, type Request } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import authenticateToken from "../middleware/authenticateToken";
dotenv.config();

const router = Router();
const prisma = new PrismaClient();

router.get(
	"/workouts/:workoutId/template",
	authenticateToken,
	async (req: Request, res) => {
		const { workoutId } = req.params;

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
						},
					},
				},
			});

			if (!workout) {
				return res.status(404).json({ error: "Workout not found" });
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

			// Format the exercise data
			const templateData = workoutExercises.map((exercise) => ({
				workout_id: exercise.workout_id,
				exercise_id: exercise.exercise_id,
				sets: exercise.sets,
				reps: exercise.reps,
				weight: exercise.weight,
				order: exercise.order,
				exercises: {
					id: exercise.exercises.id,
					name: exercise.exercises.name,
					equipment: exercise.exercises.equipment,
					category: exercise.exercises.category,
				},
				superset_with: supersetMap[exercise.exercise_id] || null,
			}));

			// Return the structured response
			return res.status(200).json({
				exercises: templateData,
				programType: workout.programs?.programType || "MANUAL", // Default to MANUAL if not specified
				programId: workout.program_id,
				programName: workout.programs?.name,
			});
		} catch (error) {
			console.error("Error fetching workout template:", error);
			return res.status(500).json({
				error: "Internal server error",
				message: error instanceof Error ? error.message : "Unknown error",
			});
		}
	},
);

export default router;
