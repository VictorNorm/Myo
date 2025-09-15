// Smart Volume Management System
// Prioritizes compound movements when managing volume limits

import { muscleGroups, getAllPrimaryMovements, getAllSecondaryMovements } from './movementPatterns';

export interface VolumeAllocation {
  exercise: string;
  recommendedSets: number;
  reason: string;
}

/**
 * Allocate volume across exercises with compound movement priority
 * @param exercises - List of selected exercises
 * @param defaultSets - Default sets per exercise requested by user
 * @param maxSetsPerMuscleGroup - Maximum sets per muscle group per session (default 8)
 * @returns Array of volume allocations with recommended sets and reasons
 */
export const allocateVolume = (
  exercises: string[], 
  defaultSets: number,
  maxSetsPerMuscleGroup: number = 8
): VolumeAllocation[] => {
  
  const allocations: VolumeAllocation[] = [];
  const muscleGroupUsage: Record<string, string[]> = {};
  
  // Track which exercises use which muscle groups
  for (const exercise of exercises) {
    for (const [muscleGroup, exerciseList] of Object.entries(muscleGroups)) {
      if (exerciseList.includes(exercise)) {
        if (!muscleGroupUsage[muscleGroup]) {
          muscleGroupUsage[muscleGroup] = [];
        }
        muscleGroupUsage[muscleGroup].push(exercise);
      }
    }
  }
  
  // Allocate sets with compound movement priority
  for (const exercise of exercises) {
    let allocatedSets = defaultSets;
    let reason = `${defaultSets} sets as requested`;
    
    // Check if this exercise conflicts with volume limits
    for (const [muscleGroup, groupExercises] of Object.entries(muscleGroupUsage)) {
      if (groupExercises.includes(exercise)) {
        const totalExercisesInGroup = groupExercises.length;
        const totalPotentialSets = totalExercisesInGroup * defaultSets;
        
        if (totalPotentialSets > maxSetsPerMuscleGroup) {
          // PRIORITIZE COMPOUND MOVEMENTS
          const isCompound = isCompoundMovement(exercise);
          const compoundExercises = groupExercises.filter(isCompoundMovement);
          const isolationExercises = groupExercises.filter(ex => !isCompoundMovement(ex));
          
          if (isCompound) {
            // Keep compound at default sets
            allocatedSets = defaultSets;
            reason = `${defaultSets} sets (compound movement priority)`;
          } else {
            // Reduce isolation exercise sets
            const remainingSets = Math.max(0, maxSetsPerMuscleGroup - (compoundExercises.length * defaultSets));
            const setsPerIsolation = isolationExercises.length > 0 ? 
              Math.max(1, Math.floor(remainingSets / isolationExercises.length)) : 0;
            
            allocatedSets = setsPerIsolation;
            reason = `${setsPerIsolation} sets (volume management - compound movements prioritized)`;
          }
          
          // Break after finding the first muscle group that needs volume management
          break;
        }
      }
    }
    
    allocations.push({
      exercise,
      recommendedSets: allocatedSets,
      reason
    });
  }
  
  return allocations;
};

/**
 * Check if an exercise is considered a compound movement
 * @param exercise - Exercise name to check
 * @returns true if exercise is compound, false if isolation
 */
const isCompoundMovement = (exercise: string): boolean => {
  const allCompound = [
    ...getAllPrimaryMovements(),
    ...getAllSecondaryMovements()
  ];
  return allCompound.includes(exercise);
};

/**
 * Calculate total sets for a muscle group from exercise list
 * @param exercises - List of exercises with their allocated sets
 * @param muscleGroup - Target muscle group
 * @returns Total sets targeting this muscle group
 */
export const calculateMuscleGroupVolume = (
  exercises: VolumeAllocation[], 
  muscleGroup: keyof typeof muscleGroups
): number => {
  const muscleGroupExercises = muscleGroups[muscleGroup];
  return exercises
    .filter(allocation => muscleGroupExercises.includes(allocation.exercise))
    .reduce((total, allocation) => total + allocation.recommendedSets, 0);
};

/**
 * Get muscle groups that would be overtrained with current allocation
 * @param exercises - Exercise allocations
 * @param maxSetsPerMuscleGroup - Maximum sets threshold
 * @returns Array of muscle groups exceeding the threshold
 */
export const getOvertrainedMuscleGroups = (
  exercises: VolumeAllocation[], 
  maxSetsPerMuscleGroup: number = 8
): string[] => {
  const overtrained: string[] = [];
  
  for (const muscleGroup of Object.keys(muscleGroups) as Array<keyof typeof muscleGroups>) {
    const totalVolume = calculateMuscleGroupVolume(exercises, muscleGroup);
    if (totalVolume > maxSetsPerMuscleGroup) {
      overtrained.push(muscleGroup);
    }
  }
  
  return overtrained;
};

/**
 * Suggest volume adjustments for better muscle group balance
 * @param exercises - Current exercise list
 * @param defaultSets - Default sets per exercise
 * @param maxSetsPerMuscleGroup - Maximum sets per muscle group
 * @returns Suggestions for volume optimization
 */
export const suggestVolumeAdjustments = (
  exercises: string[],
  defaultSets: number,
  maxSetsPerMuscleGroup: number = 8
): { 
  suggestions: string[]; 
  adjustedAllocations: VolumeAllocation[] 
} => {
  const allocations = allocateVolume(exercises, defaultSets, maxSetsPerMuscleGroup);
  const overtrained = getOvertrainedMuscleGroups(allocations, maxSetsPerMuscleGroup);
  
  const suggestions: string[] = [];
  
  if (overtrained.length > 0) {
    suggestions.push(`Reduced sets for isolation exercises in overtrained muscle groups: ${overtrained.join(', ')}`);
    suggestions.push('Compound movements maintained at requested sets for optimal training stimulus');
  }
  
  if (suggestions.length === 0) {
    suggestions.push('No volume adjustments needed - all muscle groups within optimal range');
  }
  
  return {
    suggestions,
    adjustedAllocations: allocations
  };
};

/**
 * Export utility function to determine if exercise is compound (for use in other files)
 */
export { isCompoundMovement as isCompound };