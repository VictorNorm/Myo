// Exercise Conflict Detection System
// Prevents conflicting exercises from being paired in supersets

import { getAllPrimaryMovements } from './movementPatterns';

// Strict conflict rules - NEVER pair these in supersets
export const conflictRules = {
  // Heavy grip conflicts - exercises that heavily tax grip strength
  heavyGripExercises: [
    "Deadlift",
    "Romanian Deadlift", 
    "Barbell Row",
    "Pull-up",
    "Dumbbell Row"
  ],
  
  // High CNS conflicts - never pair two primary movements together
  primaryMovements: getAllPrimaryMovements(),
  
  // Same muscle group conflicts - exercises that target the same primary muscles
  muscleGroupConflicts: {
    // Squatting movements
    "Squat": ["Bulgarian Split Squat"],
    "Bulgarian Split Squat": ["Squat"],
    
    // Horizontal pushing
    "Bench Press": ["Incline Dumbbell Press", "Push-up", "Dip"],
    "Incline Dumbbell Press": ["Bench Press", "Push-up", "Dip", "Overhead Press"], 
    "Push-up": ["Bench Press", "Incline Dumbbell Press", "Dip"],
    "Dip": ["Bench Press", "Incline Dumbbell Press", "Push-up"],
    
    // Vertical pushing
    "Overhead Press": ["Incline Dumbbell Press"], // Some overlap
    
    // Hinge movements
    "Deadlift": ["Romanian Deadlift"],
    "Romanian Deadlift": ["Deadlift"],
    
    // Horizontal pulling
    "Barbell Row": ["Dumbbell Row"],
    "Dumbbell Row": ["Barbell Row"],
    
    // Vertical pulling - Pull-ups are unique enough to not conflict heavily
    "Pull-up": [] // Can potentially pair with horizontal pulls in some cases
  } as Record<string, string[]>
};

/**
 * Check if two exercises have a conflict that prevents them from being paired in a superset
 * @param exercise1 - First exercise name
 * @param exercise2 - Second exercise name  
 * @returns true if exercises conflict and should not be paired
 */
export const hasConflict = (exercise1: string, exercise2: string): boolean => {
  // Don't conflict with yourself
  if (exercise1 === exercise2) {
    return true;
  }
  
  // Check heavy grip conflicts
  const bothHeavyGrip = conflictRules.heavyGripExercises.includes(exercise1) && 
                        conflictRules.heavyGripExercises.includes(exercise2);
  
  // Check primary movement conflicts - never pair two primaries  
  const bothPrimary = conflictRules.primaryMovements.includes(exercise1) &&
                      conflictRules.primaryMovements.includes(exercise2);
  
  // Check muscle group conflicts
  const muscleConflict = conflictRules.muscleGroupConflicts[exercise1]?.includes(exercise2) ||
                         conflictRules.muscleGroupConflicts[exercise2]?.includes(exercise1);
  
  return bothHeavyGrip || bothPrimary || muscleConflict;
};

/**
 * Check if an exercise can be paired with any exercise in a list
 * @param exercise - The exercise to check
 * @param exerciseList - List of exercises to check against
 * @returns true if the exercise can be paired with at least one exercise in the list
 */
export const canPairWithAny = (exercise: string, exerciseList: string[]): boolean => {
  return exerciseList.some(otherExercise => !hasConflict(exercise, otherExercise));
};

/**
 * Get all exercises from a list that can be paired with a given exercise
 * @param exercise - The exercise to find compatible partners for
 * @param exerciseList - List of potential partner exercises
 * @returns Array of compatible exercises
 */
export const getCompatibleExercises = (exercise: string, exerciseList: string[]): string[] => {
  return exerciseList.filter(otherExercise => !hasConflict(exercise, otherExercise));
};

/**
 * Validate a superset pairing to ensure no conflicts
 * @param exercises - Array of exercises to be paired in a superset
 * @returns Object with validation result and any conflict messages
 */
export const validateSuperset = (exercises: string[]): { valid: boolean; conflicts: string[] } => {
  const conflicts: string[] = [];
  
  // Check all pairwise combinations
  for (let i = 0; i < exercises.length; i++) {
    for (let j = i + 1; j < exercises.length; j++) {
      if (hasConflict(exercises[i], exercises[j])) {
        conflicts.push(`${exercises[i]} and ${exercises[j]} should not be paired in a superset`);
      }
    }
  }
  
  return {
    valid: conflicts.length === 0,
    conflicts
  };
};

/**
 * Get the type of conflict between two exercises
 * @param exercise1 - First exercise name
 * @param exercise2 - Second exercise name
 * @returns The type of conflict or null if no conflict
 */
export const getConflictType = (exercise1: string, exercise2: string): string | null => {
  if (exercise1 === exercise2) {
    return 'same-exercise';
  }
  
  const bothHeavyGrip = conflictRules.heavyGripExercises.includes(exercise1) && 
                        conflictRules.heavyGripExercises.includes(exercise2);
  if (bothHeavyGrip) {
    return 'heavy-grip';
  }
  
  const bothPrimary = conflictRules.primaryMovements.includes(exercise1) &&
                      conflictRules.primaryMovements.includes(exercise2);
  if (bothPrimary) {
    return 'primary-movement';
  }
  
  const muscleConflict = conflictRules.muscleGroupConflicts[exercise1]?.includes(exercise2) ||
                         conflictRules.muscleGroupConflicts[exercise2]?.includes(exercise1);
  if (muscleConflict) {
    return 'muscle-group';
  }
  
  return null;
};