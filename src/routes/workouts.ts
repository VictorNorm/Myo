import { Router, Request } from 'express';
import { PrismaClient, completed_exercises } from '@prisma/client';
import dotenv from 'dotenv';
import authenticateToken from '../middleware/authenticateToken';
dotenv.config();

const router = Router();
const prisma = new PrismaClient();

// Workouts route
router.get('/programs/:programId/workouts', authenticateToken, async (req: Request, res) => {
  const { programId } = req.params;

  try {
    const workouts = await prisma.workouts.findMany({ where: { program_id: Number(programId) }});
    console.log(workouts)
    res.status(200).json(workouts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/workouts/:workoutId/exercises', authenticateToken, async (req: Request, res) => {
  const { workoutId } = req.params;
  const userId = req.user.id; // Assuming `req.user` contains the authenticated user info

  try {
    // Raw SQL query to get the latest completed exercises for each exercise within the workout for the user
    const completedExercises = await prisma.$queryRaw<any[]>`
      SELECT ce.*, e.id as "exercise_id", e.name as "exercise_name"
      FROM completed_exercises ce
      JOIN (
        SELECT "exercise_id", MAX("completedAt") as latest
        FROM completed_exercises
        WHERE "workout_id" = ${parseInt(workoutId)} AND "user_id" = ${parseInt(userId)}
        GROUP BY "exercise_id"
      ) latest_ce ON ce."exercise_id" = latest_ce."exercise_id" AND ce."completedAt" = latest_ce.latest
      JOIN exercises e ON ce."exercise_id" = e.id
    `;

    console.log("Raw query results:", completedExercises);

    if (completedExercises.length > 0) {
      // Transform the completed exercises to match the workout exercises structure
      const transformedExercises = completedExercises.map(ex => ({
        workout_id: ex.workout_id,  // Transform to workout_id
        exercise_id: ex.exercise_id,  // Transform to exercise_id
        sets: ex.sets,
        reps: ex.reps,
        weight: ex.weight ? parseFloat(ex.weight) : 0, // Handle Decimal or null
        exercises: {
          id: ex.exercise_id,  // Transform to exercise_id
          name: ex.exercise_name
        }
      }));

      console.log("Transformed exercises:", transformedExercises);
      return res.status(200).json(transformedExercises);
    } else {
      console.log("No completed exercises found, fetching workout exercises");

      // Otherwise, return the workout exercises
      const workoutExercises = await prisma.workout_exercises.findMany({
        where: {
          workout_id: parseInt(workoutId)
        },
        include: {
          exercises: true
        }
      });

      // Transform workoutExercises to match the structure of completedExercises
      const transformedWorkoutExercises = workoutExercises.map(we => ({
        workout_id: we.workout_id,
        exercise_id: we.exercise_id,
        sets: we.sets,
        reps: we.reps,
        weight: we.weight ? parseFloat(we.weight as unknown as string) : 0, // Handle Decimal or null
        exercises: {
          id: we.exercises.id,
          name: we.exercises.name,
        }
      }));

      console.log("Workout exercises:", transformedWorkoutExercises);
      return res.status(200).json(transformedWorkoutExercises);
    }
  } catch (error) {
    console.error("Error fetching exercises:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


router.post('/workouts/completeWorkout', authenticateToken, async (req, res) => {
  const exerciseData = req.body;

  console.log('Received exercise data:', exerciseData);

  if (!Array.isArray(exerciseData) || exerciseData.some(data => 
    data.userId == null ||
    data.workoutId == null ||
    data.exerciseId == null ||
    data.sets == null ||
    data.reps == null ||
    data.weight == null
  )) {
    return res.status(400).json({ message: 'Invalid data format' });
  }

  try {
    const completedExercises = await Promise.all(exerciseData.map(async data => {
      return await prisma.completed_exercises.create({
        data: {
          sets: data.sets,
          reps: data.reps,
          weight: data.weight,
          user: {
            connect: {
              id: parseInt(data.userId) // Ensure userId is an integer
            }
          },
          workout: {
            connect: {
              id: parseInt(data.workoutId) // Ensure workoutId is an integer
            }
          },
          exercise: {
            connect: {
              id: parseInt(data.exerciseId) // Ensure exerciseId is an integer
            }
          },
          completedAt: new Date() // Optional, if you want to set it manually
        },
      });
    }));
    console.log('Completed exercises:', completedExercises);
    res.status(201).json(completedExercises);
  } catch (error) {
    console.error('Error during database operation:', error);
    res.status(500).json({ error: 'An error occurred while saving the exercise data.' });
  }
});


export default router;