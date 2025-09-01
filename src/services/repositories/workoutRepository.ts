import prisma from "../db";
import type { 
  workouts, 
  completed_exercises, 
  workout_exercises, 
  exercises,
  supersets,
  programs,
  exercise_baselines,
  progression_history,
  workout_progress,
  user_settings
} from "@prisma/client";

// Types for complex queries
export interface CompletedExercise {
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

export interface WorkoutWithExercises extends workouts {
  exercises?: (workout_exercises & {
    exercises: exercises;
  })[];
  supersets?: supersets[];
}

export interface WorkoutWithProgram extends workouts {
  programs: programs | null;
}

export interface ExerciseBaselineCreate {
  exercise_id: number;
  user_id: number;
  program_id: number;
  weight: number;
  reps: number;
  sets: number;
}

export interface ProgressionHistoryCreate {
  exercise_id: number;
  user_id: number;
  program_id: number;
  oldWeight: number;
  newWeight: number;
  oldReps: number;
  newReps: number;
  reason: string;
}

export interface WorkoutProgressUpsert {
  user_id: number;
  program_id: number;
  workout_id: number;
  completed_at: Date;
  next_scheduled_at?: Date | null;
}

export const workoutRepository = {
  // Program and workout queries
  findProgramWithWorkouts: async (programId: number, userId?: number) => {
    const isAdmin = !userId;
    return prisma.$transaction([
      prisma.programs.findUnique({
        where: { id: programId },
        select: { id: true, userId: true },
      }),
      prisma.workouts.findMany({
        where: {
          program_id: programId,
          ...(isAdmin ? {} : { programs: { userId } }),
        },
        orderBy: { id: "asc" },
        select: {
          id: true,
          name: true,
          program_id: true,
        },
      }),
    ]);
  },

  // Workout exercises queries
  findWorkoutExercises: async (workoutId: number) => {
    return prisma.workout_exercises.findMany({
      where: { workout_id: workoutId },
      include: { exercises: true },
      orderBy: { order: "asc" },
    });
  },

  // Complex query for completed exercises with workout templates
  findCompletedExercisesWithTemplate: async (workoutId: number, userId: number): Promise<CompletedExercise[]> => {
    return prisma.$queryRaw<CompletedExercise[]>`
      -- First part: Latest completed exercises by the user
      SELECT 
        ce.exercise_id,
        ce.sets,
        ce.reps,
        ce.weight,
        ce."completedAt" as timestamp,
        'completed' as source
      FROM (
        SELECT DISTINCT ON (exercise_id)
          exercise_id,
          sets,
          reps,
          weight,
          "completedAt"
        FROM completed_exercises
        WHERE workout_id = ${workoutId}
        AND user_id = ${userId}
        ORDER BY exercise_id, "completedAt" DESC
      ) ce
      
      UNION ALL
      
      -- Second part: Workout exercises (template)
      SELECT 
        we.exercise_id,
        we.sets,
        we.reps,
        we.weight,
        we."updatedAt" as timestamp,
        'workout' as source
      FROM workout_exercises we
      WHERE we.workout_id = ${workoutId}
      
      -- Final ordering to get latest of either source
      ORDER BY exercise_id, timestamp DESC
    `;
  },

  // Supersets queries
  findWorkoutSupersets: async (workoutId: number) => {
    return prisma.supersets.findMany({
      where: { workout_id: workoutId },
      orderBy: { order: "asc" },
    });
  },

  // Workout and program details
  findWorkoutWithProgram: async (workoutId: number): Promise<WorkoutWithProgram | null> => {
    return prisma.workouts.findUnique({
      where: { id: workoutId },
      include: { programs: true },
    });
  },

  findProgramById: async (programId: number) => {
    return prisma.programs.findUnique({
      where: { id: programId },
    });
  },

  // Exercise queries
  findExerciseById: async (exerciseId: number) => {
    return prisma.exercises.findUnique({
      where: { id: exerciseId },
    });
  },

  // User settings
  findUserSettings: async (userId: number) => {
    return prisma.user_settings.findUnique({
      where: { user_id: userId },
    });
  },

  createDefaultUserSettings: async (userId: number) => {
    return prisma.user_settings.create({
      data: {
        user_id: userId,
        experienceLevel: "BEGINNER",
        barbellIncrement: 2.5,
        dumbbellIncrement: 2.0,
        cableIncrement: 2.5,
        machineIncrement: 5.0,
        useMetric: true,
        darkMode: true,
      },
    });
  },

  // Exercise baselines
  findExerciseBaseline: async (exerciseId: number, userId: number, programId: number) => {
    return prisma.exercise_baselines.findUnique({
      where: {
        exercise_id_user_id_program_id: {
          exercise_id: exerciseId,
          user_id: userId,
          program_id: programId,
        },
      },
    });
  },

  upsertExerciseBaseline: async (data: ExerciseBaselineCreate) => {
    return prisma.exercise_baselines.upsert({
      where: {
        exercise_id_user_id_program_id: {
          exercise_id: data.exercise_id,
          user_id: data.user_id,
          program_id: data.program_id,
        },
      },
      update: {
        weight: data.weight,
        reps: data.reps,
        sets: data.sets,
      },
      create: data,
    });
  },

  createExerciseBaseline: async (data: ExerciseBaselineCreate) => {
    return prisma.exercise_baselines.create({ data });
  },

  // Progression history
  createProgressionHistory: async (data: ProgressionHistoryCreate) => {
    return prisma.progression_history.create({ data });
  },

  // Completed exercises
  createCompletedExercise: async (data: any) => {
    return prisma.completed_exercises.create({
      data: {
        ...data,
        weight: typeof data.weight === 'number' ? data.weight.toString() : data.weight,
        completedAt: data.completedAt || new Date(),
      },
    });
  },

  // Workout progress
  upsertWorkoutProgress: async (data: WorkoutProgressUpsert) => {
    return prisma.workout_progress.upsert({
      where: {
        user_id_program_id_workout_id: {
          user_id: data.user_id,
          program_id: data.program_id,
          workout_id: data.workout_id,
        },
      },
      create: data,
      update: {
        completed_at: data.completed_at,
        next_scheduled_at: data.next_scheduled_at,
        updated_at: new Date(),
      },
    });
  },

  // Workout creation
  createWorkout: async (name: string, programId: number) => {
    return prisma.workouts.create({
      data: {
        name,
        program_id: programId,
      },
    });
  },

  // Transaction helper for complex operations
  executeTransaction: async <T>(callback: (tx: any) => Promise<T>): Promise<T> => {
    return prisma.$transaction(callback);
  },
};