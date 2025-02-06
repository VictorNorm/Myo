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

			// Format the response
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

			return res.status(200).json(templateData);
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
