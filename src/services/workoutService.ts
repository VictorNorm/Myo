import { workoutRepository, type CompletedExercise, type ExerciseBaselineCreate, type ProgressionHistoryCreate } from "./repositories/workoutRepository";
import prisma from "./db";
import logger from "./logger";
import type { Decimal } from "@prisma/client/runtime/library";
import {
  calculateProgression,
  type ExerciseData,
  type UserEquipmentSettings,
} from "fitness-progression-calculator";

// Business logic interfaces
export interface ExerciseCompletionData {
  userId: number;
  workoutId: number;
  exerciseId: number;
  sets: number;
  reps: number;
  weight: number;
  rating: number;
  useAdaptiveIncrements?: boolean;
  programGoal?: "STRENGTH" | "HYPERTROPHY";
}

export interface ExerciseRatingData {
  exerciseId: number;
  workoutId: number;
  sets: number;
  reps: number;
  weight: number;
  rating: number;
  equipment_type: string;
  is_compound: boolean;
  useAdaptiveIncrements?: boolean;
}

export interface WorkoutExerciseResult {
  workout_id: number;
  exercise_id: number;
  sets: number | null;
  reps: number | null;
  weight: number;
  order: number;
  exercises: {
    id: number;
    name: string;
  };
  lastCompleted: Date | null;
  superset_with: number | null;
}

export interface ProgressionResult {
  exerciseId: number;
  oldWeight: number;
  newWeight: number;
  oldReps: number;
  newReps: number;
  exerciseName: string;
  message?: string;
}

export interface WorkoutCompletionResult {
  completedExercises: any[];
  progressionResults: ProgressionResult[];
  programType: string;
}

// Utility function to convert Decimal to number
function toNumber(value: Decimal | null | undefined, defaultValue: number): number {
  return value ? Number(value) : defaultValue;
}

export const workoutService = {
  // Get workouts for a program with authorization
  getProgramWorkouts: async (programId: number, userId: number, isAdmin = false) => {
    const [program, workouts] = await workoutRepository.findProgramWithWorkouts(
      programId,
      isAdmin ? undefined : userId
    );

    if (!program) {
      throw new Error("Program not found");
    }

    // Authorization check for non-admins
    if (!isAdmin && program.userId !== userId) {
      throw new Error("Not authorized to access this program's workouts");
    }

    return workouts;
  },

  // Get workout exercises with completion data and supersets
  getWorkoutExercises: async (workoutId: number, userId: number): Promise<WorkoutExerciseResult[]> => {
    const workoutExercises = await workoutRepository.findWorkoutExercises(workoutId);

    if (!workoutExercises.length) {
      logger.info("No exercises found for workout", { workoutId, userId });
      return [];
    }

    // Get completed exercises and supersets in parallel
    const [completedExercises, supersets] = await Promise.all([
      workoutRepository.findCompletedExercisesWithTemplate(workoutId, userId),
      workoutRepository.findWorkoutSupersets(workoutId)
    ]);

    // Create lookup maps
    const latestValuesMap = new Map(
      completedExercises.map((ce) => [ce.exercise_id, ce])
    );

    const supersetMap = supersets.reduce(
      (acc, superset) => {
        acc[superset.first_exercise_id] = superset.second_exercise_id;
        acc[superset.second_exercise_id] = superset.first_exercise_id;
        return acc;
      },
      {} as Record<number, number>
    );

    // Merge exercise data with completion history
    return workoutExercises.map((we) => {
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
        lastCompleted: latest?.source === "completed" ? latest.timestamp : null,
        superset_with: supersetMap[we.exercise_id] || null,
      };
    });
  },

  // Complete a full workout with progression calculations
  completeWorkout: async (
    exerciseDataArray: ExerciseCompletionData[],
    isBadDay: boolean = false
  ): Promise<WorkoutCompletionResult> => {
    if (!Array.isArray(exerciseDataArray) || exerciseDataArray.length === 0) {
      throw new Error("Invalid exercise data format");
    }

    const workoutId = exerciseDataArray[0].workoutId;
    const userId = exerciseDataArray[0].userId;

    // Get workout and program details
    const workout = await workoutRepository.findWorkoutWithProgram(workoutId);
    if (!workout || !workout.program_id) {
      throw new Error("Workout not found or not associated with a program");
    }

    const programId = workout.program_id;
    const isAutomated = workout.programs?.programType === "AUTOMATED";
    const programGoal = workout.programs?.goal || "HYPERTROPHY";

    logger.debug("Processing workout completion", {
      workoutId,
      userId,
      programId,
      programType: workout.programs?.programType,
      exerciseCount: exerciseDataArray.length,
      isBadDay,
      isAutomated,
    });

    // Process all exercises in a transaction
    return workoutRepository.executeTransaction(async (prisma) => {
      const progressionResults: ProgressionResult[] = [];

      // Process each exercise
      const completedExercises = await Promise.all(
        exerciseDataArray.map(async (data) => {
          const exercise = await workoutRepository.findExerciseById(data.exerciseId);
          if (!exercise) {
            throw new Error(`Exercise ${data.exerciseId} not found`);
          }

          // Save completed exercise
          const completed = await workoutRepository.createCompletedExercise({
            sets: data.sets,
            reps: data.reps,
            weight: data.weight,
            rating: data.rating,
            user_id: data.userId,
            workout_id: data.workoutId,
            exercise_id: data.exerciseId,
            completedAt: new Date(),
          });

          // Skip progression calculation on bad days
          if (!isBadDay) {
            // Calculate progression
            const progressionResult = await workoutService.calculateExerciseProgression(
              data,
              exercise,
              programGoal
            );

            progressionResults.push({
              exerciseId: data.exerciseId,
              oldWeight: data.weight,
              newWeight: progressionResult.newWeight,
              oldReps: data.reps,
              newReps: progressionResult.newReps,
              exerciseName: exercise.name,
            });

            // Handle progression based on program type
            if (isAutomated) {
              // Record progression history
              await workoutRepository.createProgressionHistory({
                exercise_id: data.exerciseId,
                user_id: data.userId,
                program_id: programId,
                oldWeight: data.weight,
                newWeight: progressionResult.newWeight,
                oldReps: data.reps,
                newReps: progressionResult.newReps,
                reason: `Rating-based progression (${data.rating}/5)`,
              });

              // Update exercise baseline
              await workoutRepository.upsertExerciseBaseline({
                exercise_id: data.exerciseId,
                user_id: data.userId,
                program_id: programId,
                weight: progressionResult.newWeight,
                reps: progressionResult.newReps,
                sets: data.sets,
              });
            } else {
              // For manual programs, only create baselines if they don't exist
              const existingBaseline = await workoutRepository.findExerciseBaseline(
                data.exerciseId,
                data.userId,
                programId
              );

              if (!existingBaseline) {
                await workoutRepository.createExerciseBaseline({
                  exercise_id: data.exerciseId,
                  user_id: data.userId,
                  program_id: programId,
                  sets: data.sets,
                  reps: data.reps,
                  weight: data.weight,
                });
              }
            }
          } else {
            logger.debug("Skipping progression calculation for bad day", {
              exerciseId: data.exerciseId,
              userId: data.userId,
              isBadDay: true,
            });

            // Still record the exercise completion but no progression
            progressionResults.push({
              exerciseId: data.exerciseId,
              oldWeight: data.weight,
              newWeight: data.weight, // No change
              oldReps: data.reps,
              newReps: data.reps, // No change
              exerciseName: exercise.name,
              message: "Bad day - no progression calculated",
            });
          }

          return completed;
        })
      );

      // Update workout progress
      await workoutRepository.upsertWorkoutProgress({
        user_id: userId,
        program_id: programId,
        workout_id: workoutId,
        completed_at: new Date(),
        next_scheduled_at: null,
      });

      // Insert into workout_completions for historical tracking and frequency stats
      await prisma.workout_completions.create({
        data: {
          user_id: userId,
          program_id: programId,
          workout_id: workoutId,
          completed_at: new Date(),
          is_bad_day: isBadDay,
        },
      });

      logger.debug("Recorded workout completion for frequency tracking", {
        userId,
        programId,
        workoutId,
      });

      return {
        completedExercises,
        progressionResults,
        programType: workout.programs?.programType || "MANUAL",
        isBadDay,
      };
    });
  },

  // Rate individual exercise and calculate progression
  rateExercise: async (userId: number, exerciseData: ExerciseRatingData) => {
    const exercise = await workoutRepository.findExerciseById(exerciseData.exerciseId);
    if (!exercise) {
      throw new Error("Exercise not found");
    }

    const workout = await workoutRepository.findWorkoutWithProgram(exerciseData.workoutId);
    if (!workout || !workout.program_id) {
      throw new Error("Workout not found or not associated with a program");
    }

    const programId = workout.program_id;
    const programGoal = workout.programs?.goal || "HYPERTROPHY";

    // Get or create user settings
    let userSettings = await workoutRepository.findUserSettings(userId);
    if (!userSettings) {
      userSettings = await workoutRepository.createDefaultUserSettings(userId);
    }

    // Record completed exercise
    const completedExercise = await workoutRepository.createCompletedExercise({
      exercise_id: exerciseData.exerciseId,
      user_id: userId,
      workout_id: exerciseData.workoutId,
      sets: exerciseData.sets,
      reps: exerciseData.reps,
      weight: exerciseData.weight,
      rating: exerciseData.rating,
    });

    if (!completedExercise) {
      throw new Error("Failed to record exercise completion");
    }

    // Calculate progression
    const progressionResult = await workoutService.calculateProgressionForExercise(
      exerciseData,
      exercise.name,
      programGoal,
      userSettings,
      exerciseData.equipment_type
    );

    // Record progression history and update baseline
    await Promise.all([
      workoutRepository.createProgressionHistory({
        exercise_id: exerciseData.exerciseId,
        user_id: userId,
        program_id: programId,
        oldWeight: exerciseData.weight,
        newWeight: progressionResult.newWeight,
        oldReps: exerciseData.reps,
        newReps: progressionResult.newReps,
        reason: "Rating-based progression",
      }),
      workoutRepository.upsertExerciseBaseline({
        exercise_id: exerciseData.exerciseId,
        user_id: userId,
        program_id: programId,
        weight: progressionResult.newWeight,
        reps: progressionResult.newReps,
        sets: exerciseData.sets,
      }),
    ]);

    logger.info("Exercise rated and progression updated", {
      exerciseId: exerciseData.exerciseId,
      exerciseName: exercise.name,
      userId,
      rating: exerciseData.rating,
      weightChange: progressionResult.newWeight - exerciseData.weight,
      repsChange: progressionResult.newReps - exerciseData.reps,
    });

    return {
      success: true,
      exerciseId: exerciseData.exerciseId,
      oldWeight: exerciseData.weight,
      newWeight: progressionResult.newWeight,
      oldReps: exerciseData.reps,
      newReps: progressionResult.newReps,
      adaptiveIncrements: exerciseData.useAdaptiveIncrements ?? true,
    };
  },

  // Add new workout to program
  addWorkout: async (name: string, programId: number, userId: number, userRole?: string) => {
    const program = await workoutRepository.findProgramById(programId);
    if (!program) {
      throw new Error("Program does not exist");
    }

    // Authorization check
    if (program.userId !== userId && userRole !== "ADMIN") {
      throw new Error("Not authorized to add workouts to this program");
    }

    const workout = await workoutRepository.createWorkout(name, programId);

    logger.info("Workout added to program", {
      workoutId: workout.id,
      workoutName: name,
      programId,
      programName: program.name,
      userId,
    });

    return {
      message: `You've successfully added a workout to program: ${program.name}.`,
      workoutId: workout.id,
    };
  },

  // Helper: Calculate progression for exercise completion
  calculateExerciseProgression: async (
    data: ExerciseCompletionData,
    exercise: any,
    programGoal: string
  ) => {
    const userSettings = await workoutRepository.findUserSettings(data.userId);
    const equipmentSettings = workoutService.buildEquipmentSettings(userSettings, data.useAdaptiveIncrements, exercise.equipment);

    const exerciseProgressionData: ExerciseData = {
      sets: data.sets,
      reps: data.reps,
      weight: data.weight,
      rating: data.rating,
      equipment_type: exercise.equipment,
      is_compound: exercise.category === "COMPOUND",
      exercise_name: exercise.name,
    };

    const goal = data.programGoal || programGoal;
    return calculateProgression(
      exerciseProgressionData,
      goal === "STRENGTH" ? "STRENGTH" : "HYPERTROPHY",
      equipmentSettings
    );
  },

  // Helper: Calculate progression for exercise rating
  calculateProgressionForExercise: async (
    exerciseData: ExerciseRatingData,
    exerciseName: string,
    programGoal: string,
    userSettings: any,
    equipmentType: string
  ) => {
    const equipmentSettings = workoutService.buildEquipmentSettings(userSettings, exerciseData.useAdaptiveIncrements, equipmentType);

    const progressionData: ExerciseData = {
      sets: exerciseData.sets,
      reps: exerciseData.reps,
      weight: exerciseData.weight,
      rating: exerciseData.rating,
      equipment_type: exerciseData.equipment_type as "DUMBBELL" | "BARBELL" | "CABLE" | "MACHINE" | "BODYWEIGHT",
      is_compound: exerciseData.is_compound,
      exercise_name: exerciseName,
    };

    return calculateProgression(
      progressionData,
      programGoal === "STRENGTH" ? "STRENGTH" : "HYPERTROPHY",
      equipmentSettings
    );
  },

  // Helper: Build equipment settings from user preferences
  buildEquipmentSettings: (userSettings: any, useAdaptiveIncrements = true, equipmentType?: string): UserEquipmentSettings => {
    const settings: UserEquipmentSettings = {
      barbellIncrement: toNumber(userSettings?.barbellIncrement, 2.5),
      dumbbellIncrement: toNumber(userSettings?.dumbbellIncrement, 2.0),
      cableIncrement: toNumber(userSettings?.cableIncrement, 2.5),
      machineIncrement: toNumber(userSettings?.machineIncrement, 5.0),
      experienceLevel: userSettings?.experienceLevel || "BEGINNER",
    };

    // If not using adaptive increments, use fixed increment based on equipment
    if (!useAdaptiveIncrements && equipmentType) {
      let fixedIncrement: number;
      switch (equipmentType) {
        case "BARBELL":
          fixedIncrement = settings.barbellIncrement;
          break;
        case "DUMBBELL":
        case "BODYWEIGHT":
          fixedIncrement = settings.dumbbellIncrement;
          break;
        case "CABLE":
          fixedIncrement = settings.cableIncrement;
          break;
        case "MACHINE":
          fixedIncrement = settings.machineIncrement;
          break;
        default:
          fixedIncrement = 2.5;
      }

      // Override all increments with fixed value
      settings.barbellIncrement = fixedIncrement;
      settings.dumbbellIncrement = fixedIncrement;
      settings.cableIncrement = fixedIncrement;
      settings.machineIncrement = fixedIncrement;
    }

    return settings;
  },
};