import prisma from "../db";
import { Prisma, type exercises } from "@prisma/client";

interface UpsertExerciseInput {
	id: number;
	sets: number;
	reps: number;
	weight: number;
}

interface SupersetInput {
	first_exercise_id: number;
	second_exercise_id: number;
}

export const exerciseRepository = {
  findAll: async () => {
    return prisma.exercises.findMany({
      include: {
        muscle_groups: {
          include: {
            muscle_groups: true,
          },
        },
      },
    });
  },

  findById: async (id: number) => {
    return prisma.exercises.findUnique({
      where: { id },
      include: {
        muscle_groups: {
          include: {
            muscle_groups: true,
          },
        },
      },
    });
  },

  create: async (exerciseData: Omit<exercises, "id" | "createdAt">) => {
    return prisma.exercises.create({
      data: exerciseData,
    });
  },

  update: async (id: number, exerciseData: Partial<Omit<exercises, "id" | "createdAt">>) => {
    return prisma.exercises.update({
      where: { id },
      data: exerciseData,
    });
  },

  delete: async (id: number) => {
    return prisma.exercises.delete({
      where: { id },
    });
  },

  upsertExercisesToWorkout: async (
    workoutId: number,
    exercises: UpsertExerciseInput[],
    supersets?: SupersetInput[]
  ) => {
    return prisma.$transaction(
      async (prisma) => {
        // First, delete all supersets for this workout
        await prisma.supersets.deleteMany({
          where: {
            workout_id: workoutId,
          },
        });

        // Then delete the workout exercises
        await prisma.workout_exercises.deleteMany({
          where: {
            workout_id: workoutId,
          },
        });

        // Create new workout exercises with specified order
        const exerciseResults = await Promise.all(
          exercises.map((exercise, index) =>
            prisma.workout_exercises.create({
              data: {
                workout_id: workoutId,
                exercise_id: exercise.id,
                sets: exercise.sets,
                reps: exercise.reps,
                weight: exercise.weight,
                order: index,
              },
              include: {
                exercises: true,
              },
            }),
          ),
        );

        // Create new supersets if any exist
        if (supersets && Array.isArray(supersets) && supersets.length > 0) {
          await Promise.all(
            supersets.map((superset, index) =>
              prisma.supersets.create({
                data: {
                  workout_id: workoutId,
                  first_exercise_id: superset.first_exercise_id,
                  second_exercise_id: superset.second_exercise_id,
                  order: index,
                },
              }),
            ),
          );
        }

        return exerciseResults;
      },
      {
        timeout: 10000,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  },
};