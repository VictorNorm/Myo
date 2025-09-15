// Program Generator Core
// Creates smart, conflict-free workout programs based on user preferences

import { movementPatterns, getAllPrimaryMovements } from './movementPatterns';
import { getCompatibleExercises } from './exerciseConflicts';
import { allocateVolume, VolumeAllocation } from './volumeManager';
import { 
  getEquipmentPreference, 
  selectFromPattern, 
  selectCompatibleExercise, 
  getRepRange, 
  determineProgramType,
  validatePreferences 
} from '../utils/programGenerationHelpers';
import { 
  UserPreferences, 
  GeneratedProgram, 
  GeneratedWorkout, 
  SupersetStructure, 
  ExerciseAllocation 
} from '../types/programGeneration';

/**
 * Main program generation function
 * @param preferences - User preferences for program generation
 * @returns Generated program structure
 */
export const generateProgram = (preferences: UserPreferences): GeneratedProgram => {
  // Validate preferences first
  const validation = validatePreferences(preferences);
  if (!validation.valid) {
    throw new Error(`Invalid preferences: ${validation.errors.join(', ')}`);
  }

  // Step 1: Determine program type based on frequency
  const programType = determineProgramType(preferences.frequency);
  
  // Step 2: Generate workouts based on type
  switch (programType) {
    case 'FULL_BODY':
      return generateFullBodyProgram(preferences);
    case 'UPPER_LOWER':
      return generateUpperLowerProgram(preferences);
    case 'PPL':
      return generatePPLProgram(preferences);
    default:
      return generateFullBodyProgram(preferences); // Fallback
  }
};

/**
 * Generate a full-body program (2-3x per week)
 * @param prefs - User preferences
 * @returns Full-body program structure
 */
const generateFullBodyProgram = (prefs: UserPreferences): GeneratedProgram => {
  const selectedExercises = selectExercises(prefs.exerciseCount, prefs.experience);
  const volumeAllocations = allocateVolume(selectedExercises, prefs.setsPerExercise);
  
  const workout: GeneratedWorkout = {
    name: 'Full Body Workout',
    exercises: createSupersets(selectedExercises, volumeAllocations, prefs.exerciseCount, prefs.goal),
    estimatedDuration: estimateWorkoutDuration(prefs.exerciseCount, prefs.setsPerExercise)
  };

  return {
    type: 'FULL_BODY',
    frequency: prefs.frequency,
    goal: prefs.goal,
    workouts: [workout],
    totalEstimatedTime: workout.estimatedDuration ? workout.estimatedDuration * prefs.frequency : undefined,
    volumeAnalysis: analyzeVolume(volumeAllocations)
  };
};

/**
 * Generate an upper/lower split program (4x per week)
 * @param prefs - User preferences
 * @returns Upper/lower program structure
 */
const generateUpperLowerProgram = (prefs: UserPreferences): GeneratedProgram => {
  // Split exercises between upper and lower body
  const upperExercises = selectUpperBodyExercises(Math.ceil(prefs.exerciseCount * 0.6), prefs.experience);
  const lowerExercises = selectLowerBodyExercises(Math.floor(prefs.exerciseCount * 0.4), prefs.experience);
  
  const upperVolumeAllocations = allocateVolume(upperExercises, prefs.setsPerExercise);
  const lowerVolumeAllocations = allocateVolume(lowerExercises, prefs.setsPerExercise);
  
  const upperWorkout: GeneratedWorkout = {
    name: 'Upper Body',
    exercises: createSupersets(upperExercises, upperVolumeAllocations, upperExercises.length, prefs.goal),
    estimatedDuration: estimateWorkoutDuration(upperExercises.length, prefs.setsPerExercise)
  };
  
  const lowerWorkout: GeneratedWorkout = {
    name: 'Lower Body', 
    exercises: createSupersets(lowerExercises, lowerVolumeAllocations, lowerExercises.length, prefs.goal),
    estimatedDuration: estimateWorkoutDuration(lowerExercises.length, prefs.setsPerExercise)
  };

  return {
    type: 'UPPER_LOWER',
    frequency: prefs.frequency,
    goal: prefs.goal,
    workouts: [upperWorkout, lowerWorkout],
    totalEstimatedTime: ((upperWorkout.estimatedDuration || 0) + (lowerWorkout.estimatedDuration || 0)) * 2,
    volumeAnalysis: analyzeVolume([...upperVolumeAllocations, ...lowerVolumeAllocations])
  };
};

/**
 * Generate a push/pull/legs program (5-6x per week)
 * @param prefs - User preferences
 * @returns PPL program structure
 */
const generatePPLProgram = (prefs: UserPreferences): GeneratedProgram => {
  // For now, fallback to full body since PPL requires more exercise variety
  // This would be expanded when more exercises are available in the database
  return generateFullBodyProgram(prefs);
};

/**
 * Select exercises for a workout based on count and experience
 * @param count - Number of exercises to select
 * @param experience - User experience level
 * @returns Array of selected exercise names
 */
const selectExercises = (count: number, experience: string): string[] => {
  const selected: string[] = [];
  const equipmentPreference = getEquipmentPreference(experience as any);
  
  // Always include one from each major pattern first (up to 4)
  const patterns = [
    movementPatterns.primarySquat,
    movementPatterns.primaryHinge, 
    movementPatterns.primaryPush,
    movementPatterns.primaryPull
  ];
  
  // Select primary movements first
  for (let i = 0; i < Math.min(count, 4); i++) {
    const exercise = selectFromPattern(patterns[i], equipmentPreference, selected);
    if (exercise) selected.push(exercise);
  }
  
  // Fill remaining slots with secondary movements
  while (selected.length < count) {
    const remainingPatterns = [
      ...movementPatterns.secondarySquat,
      ...movementPatterns.secondaryHinge,
      ...movementPatterns.secondaryPush,
      ...movementPatterns.secondaryPull
    ];
    
    const exercise = selectCompatibleExercise(remainingPatterns, selected, equipmentPreference);
    if (exercise && !selected.includes(exercise)) {
      selected.push(exercise);
    } else {
      // If we can't find more compatible exercises, break to avoid infinite loop
      break;
    }
  }
  
  return selected;
};

/**
 * Select upper body exercises only
 */
const selectUpperBodyExercises = (count: number, experience: string): string[] => {
  const upperPatterns = [
    ...movementPatterns.primaryPush,
    ...movementPatterns.primaryPull,
    ...movementPatterns.secondaryPush, 
    ...movementPatterns.secondaryPull
  ];
  
  const selected: string[] = [];
  const equipmentPreference = getEquipmentPreference(experience as any);
  
  // Prioritize primary movements
  const primaryUpper = [...movementPatterns.primaryPush, ...movementPatterns.primaryPull];
  
  for (const exercise of primaryUpper) {
    if (selected.length < count) {
      selected.push(exercise);
    }
  }
  
  // Fill remaining with secondary
  while (selected.length < count) {
    const exercise = selectCompatibleExercise(upperPatterns, selected, equipmentPreference);
    if (exercise && !selected.includes(exercise)) {
      selected.push(exercise);
    } else {
      break;
    }
  }
  
  return selected;
};

/**
 * Select lower body exercises only
 */
const selectLowerBodyExercises = (count: number, experience: string): string[] => {
  const lowerPatterns = [
    ...movementPatterns.primarySquat,
    ...movementPatterns.primaryHinge,
    ...movementPatterns.secondarySquat,
    ...movementPatterns.secondaryHinge
  ];
  
  const selected: string[] = [];
  const equipmentPreference = getEquipmentPreference(experience as any);
  
  // Prioritize primary movements
  const primaryLower = [...movementPatterns.primarySquat, ...movementPatterns.primaryHinge];
  
  for (const exercise of primaryLower) {
    if (selected.length < count) {
      selected.push(exercise);
    }
  }
  
  // Fill remaining with secondary
  while (selected.length < count) {
    const exercise = selectCompatibleExercise(lowerPatterns, selected, equipmentPreference);
    if (exercise && !selected.includes(exercise)) {
      selected.push(exercise);
    } else {
      break;
    }
  }
  
  return selected;
};

/**
 * Create superset structures from exercise list
 * @param exercises - Selected exercises
 * @param volumeAllocations - Volume allocation for each exercise
 * @param exerciseCount - Total exercise count
 * @param goal - Training goal
 * @returns Array of superset structures
 */
const createSupersets = (
  exercises: string[], 
  volumeAllocations: VolumeAllocation[], 
  exerciseCount: number,
  goal: 'STRENGTH' | 'HYPERTROPHY'
): SupersetStructure[] => {
  const supersets: SupersetStructure[] = [];
  
  // Create exercise allocations with volume data
  const exerciseAllocations: ExerciseAllocation[] = exercises.map(exercise => {
    const allocation = volumeAllocations.find(a => a.exercise === exercise);
    return {
      name: exercise,
      sets: allocation?.recommendedSets || 3,
      reps: getRepRange(exercise, goal)
    };
  });
  
  if (exerciseCount === 3) {
    // 1 superset + 1 single exercise
    supersets.push({
      type: 'superset',
      exercises: exerciseAllocations.slice(0, 2)
    });
    supersets.push({
      type: 'single',
      exercises: exerciseAllocations.slice(2, 3)
    });
  } else if (exerciseCount === 4) {
    // 2 supersets
    supersets.push({
      type: 'superset',
      exercises: exerciseAllocations.slice(0, 2)
    });
    supersets.push({
      type: 'superset', 
      exercises: exerciseAllocations.slice(2, 4)
    });
  } else if (exerciseCount === 5) {
    // 2 supersets + 1 single
    supersets.push({
      type: 'superset',
      exercises: exerciseAllocations.slice(0, 2)
    });
    supersets.push({
      type: 'superset',
      exercises: exerciseAllocations.slice(2, 4)
    });
    supersets.push({
      type: 'single',
      exercises: exerciseAllocations.slice(4, 5)
    });
  } else {
    // 6 exercises = 3 supersets
    supersets.push({
      type: 'superset',
      exercises: exerciseAllocations.slice(0, 2)
    });
    supersets.push({
      type: 'superset',
      exercises: exerciseAllocations.slice(2, 4)
    });
    supersets.push({
      type: 'superset',
      exercises: exerciseAllocations.slice(4, 6)
    });
  }
  
  return supersets;
};

/**
 * Estimate workout duration in minutes
 */
const estimateWorkoutDuration = (exerciseCount: number, setsPerExercise: number): number => {
  // 3 minutes per set (1 min execution + 2 min rest) + 5 min warmup
  const totalSets = exerciseCount * setsPerExercise;
  return totalSets * 3 + 5;
};

/**
 * Analyze volume distribution across muscle groups
 */
const analyzeVolume = (allocations: VolumeAllocation[]) => {
  const totalSets = allocations.reduce((sum, allocation) => sum + allocation.recommendedSets, 0);
  
  return {
    totalSets,
    muscleGroupDistribution: {}, // Would be expanded with actual muscle group analysis
    warnings: allocations
      .filter(a => a.reason.includes('volume management'))
      .map(a => `${a.exercise}: ${a.reason}`)
  };
};