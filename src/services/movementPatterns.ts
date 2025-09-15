// Movement Pattern Database for Program Generation
// Maps exercises to movement patterns based on CNS demand and muscle activation

export const movementPatterns = {
  // HIGH CNS DEMAND (Primary - never pair together in supersets)
  primarySquat: [
    "Squat", // Maps to existing "Squat" in database
  ],
  primaryHinge: [
    "Deadlift", // Maps to existing "Deadlift" in database  
  ],
  primaryPush: [
    "Bench Press", // Maps to existing "Bench Press" in database
    "Overhead Press", // Maps to existing "Overhead Press" in database
  ],
  primaryPull: [
    "Barbell Row", // Maps to existing "Barbell Row" in database
  ],
  
  // MODERATE CNS (Secondary - can pair with primaries)
  secondarySquat: [
    "Bulgarian Split Squat", // Maps to existing exercise
  ],
  secondaryHinge: [
    "Romanian Deadlift", // Maps to existing exercise
  ],
  secondaryPush: [
    "Incline Dumbbell Press", // Maps to existing exercise
    "Push-up", // Maps to existing "Push-up" in database
    "Dip", // Maps to existing "Dip" in database
  ],
  secondaryPull: [
    "Dumbbell Row", // Maps to existing exercise
    "Pull-up", // Maps to existing "Pull-up" in database
  ],
  
  // LOW CNS (Isolation - pairs with anything)
  // Note: Based on current database, these are limited compound movements
  // This will need to be expanded when isolation exercises are added to the database
  isolation: {
    chest: [], // No isolation exercises in current database
    back: [],
    shoulders: [], 
    arms: [],
    legs: [],
    calves: []
  }
};

// Muscle group mappings for volume management
export const muscleGroups = {
  quads: [
    "Squat", 
    "Bulgarian Split Squat"
  ],
  hamstrings: [
    "Romanian Deadlift", 
    "Deadlift", 
    "Bulgarian Split Squat"
  ],
  glutes: [
    "Deadlift", 
    "Romanian Deadlift", 
    "Squat",
    "Bulgarian Split Squat"
  ],
  chest: [
    "Bench Press", 
    "Incline Dumbbell Press", 
    "Push-up",
    "Dip"
  ],
  back: [
    "Barbell Row", 
    "Dumbbell Row", 
    "Pull-up",
    "Deadlift" // Also heavily involves back
  ],
  shoulders: [
    "Overhead Press",
    "Incline Dumbbell Press", // Secondary shoulder involvement
    "Push-up" // Secondary shoulder involvement
  ],
  triceps: [
    "Overhead Press",
    "Bench Press", 
    "Incline Dumbbell Press",
    "Push-up",
    "Dip"
  ],
  biceps: [
    "Pull-up",
    "Barbell Row",
    "Dumbbell Row"
  ]
};

// Helper function to get all exercises in a movement pattern
export const getAllExercisesInPattern = (patternName: keyof typeof movementPatterns): string[] => {
  const pattern = movementPatterns[patternName];
  return Array.isArray(pattern) ? pattern : [];
};

// Helper function to get all exercises for a muscle group
export const getExercisesForMuscleGroup = (muscleGroup: keyof typeof muscleGroups): string[] => {
  return muscleGroups[muscleGroup] || [];
};

// Helper function to get all primary movements
export const getAllPrimaryMovements = (): string[] => {
  return [
    ...movementPatterns.primarySquat,
    ...movementPatterns.primaryHinge,
    ...movementPatterns.primaryPush,
    ...movementPatterns.primaryPull
  ];
};

// Helper function to get all secondary movements  
export const getAllSecondaryMovements = (): string[] => {
  return [
    ...movementPatterns.secondarySquat,
    ...movementPatterns.secondaryHinge,
    ...movementPatterns.secondaryPush,
    ...movementPatterns.secondaryPull
  ];
};

// Helper function to get all isolation movements
export const getAllIsolationMovements = (): string[] => {
  return Object.values(movementPatterns.isolation).flat();
};