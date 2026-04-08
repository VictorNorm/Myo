import type { Equipment, ExerciseCategory } from "@prisma/client";

/**
 * Shape of an exercise record as returned from workout repository joins.
 * Reflects the `exercises` table columns accessed in workoutService.ts.
 */
export interface WorkoutExerciseRecord {
  id: number;
  name: string;
  equipment: Equipment;
  category: ExerciseCategory;
}
