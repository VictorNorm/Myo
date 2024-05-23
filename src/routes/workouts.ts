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

    type CompletedExerciseWithDetails = {
      id: number;
      userId: number;
      workoutId: number;
      exerciseId: number;
      sets: number;
      reps: number;
      weight: number;
      completedAt: Date;
      exercise: {
        id: number;
        name: string;
        // Add other exercise fields as needed
      };
    };

    // Raw SQL query to get the latest completed exercises for each exercise within the workout for the user
    const completedExercises = await prisma.$queryRaw<CompletedExerciseWithDetails[]>`
      SELECT ce.*
      FROM completed_exercises ce
      JOIN (
        SELECT exerciseId, MAX(completedAt) as latest
        FROM completed_exercises
        WHERE workoutId = ${parseInt(workoutId)} AND userId = ${parseInt(userId)}
        GROUP BY exerciseId
      ) latest_ce ON ce.exerciseId = latest_ce.exerciseId AND ce.completedAt = latest_ce.latest
    `;

    if (completedExercises.length > 0) {
      // Return the latest completed exercises if they exist
      console.log(completedExercises)
      return res.status(200).json(completedExercises);
    } else {
      // Otherwise, return the workout exercises
      const workoutExercises = await prisma.workout_exercises.findMany({
        where: {
          workout_id: parseInt(workoutId)
        },
        include: {
          exercises: true
        }
      });
      return res.status(200).json(workoutExercises);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

  router.post('/workouts/completeWorkout', authenticateToken, async (req: Request, res) => {
    // const { workoutId } = req.params;
    // const {userId, exerciseId, sets, reps, weight} = req.body;

    const exerciseData = req.body;

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
              id: data.userId,
            },
          },
          workout: {
            connect: {
              id: data.workoutId,
            },
          },
          exercise: {
            connect: {
              id: data.exerciseId,
            },
          },
          completedAt: new Date(), // Optional, if you want to set it manually
        },
      });
    }));
      res.status(201).json(completedExercises);
    } catch (error) {
      res.status(500).json({ error: 'An error occurred while saving the exercise data.' });
    }

  });

export default router;