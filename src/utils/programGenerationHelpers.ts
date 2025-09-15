// Helper utilities for program generation

import { movementPatterns, getAllPrimaryMovements } from '../services/movementPatterns';
import { getCompatibleExercises } from '../services/exerciseConflicts';

export type ExperienceLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type Goal = 'STRENGTH' | 'HYPERTROPHY';
export type ProgramType = 'FULL_BODY' | 'UPPER_LOWER' | 'PPL';

/**
 * Determine equipment preference based on experience level
 * @param experience - User's experience level
 * @returns Preferred equipment types in priority order
 */
export const getEquipmentPreference = (experience: ExperienceLevel): string[] => {
  switch (experience) {
    case 'BEGINNER':
      return ['BARBELL', 'BODYWEIGHT', 'DUMBBELL']; // Focus on basic movements
    case 'INTERMEDIATE':
      return ['BARBELL', 'DUMBBELL', 'BODYWEIGHT']; // More variety
    case 'ADVANCED':
      return ['BARBELL', 'DUMBBELL', 'BODYWEIGHT']; // All equipment types
    default:
      return ['BARBELL', 'BODYWEIGHT', 'DUMBBELL'];
  }
};

/**
 * Select an exercise from a movement pattern based on equipment preference
 * @param pattern - Array of exercises in the pattern
 * @param equipmentPreference - Preferred equipment types
 * @param alreadySelected - Exercises already selected (to avoid duplicates)
 * @returns Selected exercise or null if none available
 */
export const selectFromPattern = (
  pattern: string[], 
  equipmentPreference: string[], 
  alreadySelected: string[]
): string | null => {
  // Filter out already selected exercises
  const availableExercises = pattern.filter(exercise => !alreadySelected.includes(exercise));
  
  if (availableExercises.length === 0) {
    return null;
  }
  
  // For simplicity, select the first available exercise
  // In a more sophisticated implementation, we could use equipment preference
  return availableExercises[0];
};

/**
 * Select a compatible exercise from a list that doesn't conflict with already selected exercises
 * @param availableExercises - List of potential exercises
 * @param alreadySelected - Exercises already selected
 * @param equipmentPreference - Preferred equipment types
 * @returns Selected exercise or null if none compatible
 */
export const selectCompatibleExercise = (
  availableExercises: string[], 
  alreadySelected: string[], 
  equipmentPreference: string[]
): string | null => {
  // Filter out already selected exercises
  const unselected = availableExercises.filter(exercise => !alreadySelected.includes(exercise));
  
  if (unselected.length === 0) {
    return null;
  }
  
  // Find exercises that are compatible with all already selected exercises
  const compatible = unselected.filter(exercise => {
    return getCompatibleExercises(exercise, alreadySelected).length === alreadySelected.length;
  });
  
  if (compatible.length === 0) {
    // If no fully compatible exercises, just pick the first unselected one
    return unselected[0];
  }
  
  // Return the first compatible exercise
  return compatible[0];
};

/**
 * Get rep range based on goal and exercise type
 * @param exercise - Exercise name
 * @param goal - Training goal
 * @returns Rep range string
 */
export const getRepRange = (exercise: string, goal: Goal = 'HYPERTROPHY'): string => {
  const isPrimary = getAllPrimaryMovements().includes(exercise);
  
  if (goal === 'STRENGTH') {
    if (isPrimary) {
      return '3-5'; // Heavy compound movements for strength
    } else {
      return '5-8'; // Secondary movements for strength support
    }
  } else { // HYPERTROPHY
    if (isPrimary) {
      return '6-8'; // Moderate rep range for compound hypertrophy
    } else {
      return '8-12'; // Higher reps for secondary/isolation movements
    }
  }
};

/**
 * Determine program type based on training frequency
 * @param frequency - Number of training days per week
 * @returns Recommended program type
 */
export const determineProgramType = (frequency: number): ProgramType => {
  if (frequency <= 3) {
    return 'FULL_BODY';
  } else if (frequency <= 4) {
    return 'UPPER_LOWER';
  } else {
    return 'PPL'; // Push/Pull/Legs for 5+ days
  }
};

/**
 * Calculate estimated workout duration
 * @param exerciseCount - Number of exercises
 * @param setsPerExercise - Average sets per exercise
 * @param restTime - Rest time between sets in seconds (default 90s)
 * @returns Estimated duration in minutes
 */
export const estimateWorkoutDuration = (
  exerciseCount: number, 
  setsPerExercise: number, 
  restTime: number = 90
): number => {
  // Assume 1 minute per set + rest time
  const totalSets = exerciseCount * setsPerExercise;
  const executionTime = totalSets * 1; // 1 minute per set
  const totalRestTime = (totalSets - 1) * (restTime / 60); // Rest between sets in minutes
  const warmupTime = 5; // 5 minutes warmup
  
  return Math.round(executionTime + totalRestTime + warmupTime);
};

/**
 * Validate user preferences for program generation
 * @param preferences - User preferences object
 * @returns Validation result with any errors
 */
export const validatePreferences = (preferences: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!preferences.frequency || preferences.frequency < 2 || preferences.frequency > 6) {
    errors.push('Frequency must be between 2 and 6 days per week');
  }
  
  if (!preferences.goal || !['STRENGTH', 'HYPERTROPHY'].includes(preferences.goal)) {
    errors.push('Goal must be either STRENGTH or HYPERTROPHY');
  }
  
  if (!preferences.experience || !['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(preferences.experience)) {
    errors.push('Experience must be BEGINNER, INTERMEDIATE, or ADVANCED');
  }
  
  if (!preferences.sessionTime || preferences.sessionTime < 25 || preferences.sessionTime > 120) {
    errors.push('Session time must be between 25 and 120 minutes');
  }
  
  if (!preferences.exerciseCount || preferences.exerciseCount < 3 || preferences.exerciseCount > 6) {
    errors.push('Exercise count must be between 3 and 6');
  }
  
  if (!preferences.setsPerExercise || preferences.setsPerExercise < 2 || preferences.setsPerExercise > 4) {
    errors.push('Sets per exercise must be between 2 and 4');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Get recommended values based on experience level
 * @param experience - User's experience level
 * @returns Object with recommended defaults
 */
export const getRecommendedDefaults = (experience: ExperienceLevel): {
  frequency: number;
  sessionTime: number;
  exerciseCount: number;
  setsPerExercise: number;
  goal: Goal;
} => {
  switch (experience) {
    case 'BEGINNER':
      return {
        frequency: 3,
        sessionTime: 45,
        exerciseCount: 4,
        setsPerExercise: 3,
        goal: 'HYPERTROPHY' as Goal
      };
    case 'INTERMEDIATE':
      return {
        frequency: 4,
        sessionTime: 60,
        exerciseCount: 5,
        setsPerExercise: 4,
        goal: 'HYPERTROPHY' as Goal
      };
    case 'ADVANCED':
      return {
        frequency: 5,
        sessionTime: 75,
        exerciseCount: 6,
        setsPerExercise: 4,
        goal: 'STRENGTH' as Goal
      };
    default:
      return getRecommendedDefaults('BEGINNER');
  }
};