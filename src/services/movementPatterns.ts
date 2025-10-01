// Movement Pattern Database for Program Generation
// Updated with exact production database exercise names

export const movementPatterns = {
  // HIGH CNS DEMAND (Primary - never pair together in supersets)
  primarySquat: [
    "Barbell high bar squat",
    "Barbell low bar squat", 
    "Front squat"
  ],
  primaryHinge: [
    "Barbell deadlift",
    "Trap bar deadlift"
  ],
  primaryPush: [
    "Barbell bench press",
    "Incline barbell bench press",
    "Seated dumbbell overhead press"
  ],
  primaryPull: [
    "Barbell bent over row",
    "T bar row"
  ],
  
  // MODERATE CNS (Secondary - can pair with primaries)
  secondarySquat: [
    "Leg press",
    "Smith machine squat",
    "Dumbbell forward lunge",
    "Backward lunge"
  ],
  secondaryHinge: [
    "Romanian deadlift"
  ],
  secondaryPush: [
    "Incline dumbbell bench press",
    "Dumbbell bench press",
    "Close grip bench press",
    "Pushup",
    "Incline pushup",
    "Dips"
  ],
  secondaryPull: [
    "Single arm dumbbell row",
    "Chest supported dumbbell high row",
    "Pullup",
    "Chin-up",
    "Lat pulldown neutral wide"
  ],
  
  // LOW CNS (Isolation - pairs with anything)
  isolation: {
    chest: [
      "Cable fly",
      "Dumbbell chest fly"
    ],
    back: [
      "Lat pulldown, neutral",
      "Lat pulldown, pronated", 
      "Lat pulldown, supinated"
    ],
    shoulders: [
      "Dumbbell lateral raise",
      "Seated dumbbell lateral raise",
      "Lean in dumbbell lateral raise",
      "Single arm cable lateral raise",
      "Bent over dumbbell rear delt fly",
      "Cable rear delt fly",
      "Chest supported dumbbell rear delt fly"
    ],
    arms: [
      // Biceps
      "Barbell bicep curl",
      "Dumbbell bicep curl", 
      "EZ bar bicep curl",
      "Incline dumbbell bicep curl",
      "Incline dumbbell hammer curl",
      "Cable bicep curl, straight bar",
      "Single cable bicep curl",
      "Dual cable bicep curl",
      
      // Triceps
      "Cable tricep pushdown, bar",
      "Cable overhead tricep press, bar",
      "Cable overhead tricep press, rope attachment",
      "Dumbbell skull crusher",
      "EZ bar skull crusher",
      "EZ bar overhead tricep press"
    ],
    legs: [
      "Leg extension",
      "Machine hamstring curl",
      "Nordic hamstring"
    ],
    calves: [
      "Dumbbell standing calf raise",
      "Leg press calf raise", 
      "Smith machine calf raise"
    ],
    core: [
      "Ab rollout"
    ],
    other: [
      "Barbell shrugs",
      "Dumbbell shrugs",
      "Barbell hip thrust",
      "Back extension",
      "Jefferson curl"
    ]
  }
};

// Muscle group mappings for volume management (updated with production names)
export const muscleGroups = {
  quads: [
    "Barbell high bar squat",
    "Barbell low bar squat", 
    "Front squat",
    "Leg press",
    "Smith machine squat",
    "Dumbbell forward lunge",
    "Backward lunge",
    "Step up",
    "Leg extension"
  ],
  hamstrings: [
    "Romanian deadlift",
    "Barbell deadlift",
    "Trap bar deadlift",
    "Machine hamstring curl",
    "Nordic hamstring",
    "Dumbbell forward lunge",
    "Backward lunge"
  ],
  glutes: [
    "Barbell deadlift",
    "Trap bar deadlift", 
    "Romanian deadlift",
    "Barbell high bar squat",
    "Barbell low bar squat",
    "Barbell hip thrust",
    "Dumbbell forward lunge",
    "Backward lunge"
  ],
  chest: [
    "Barbell bench press",
    "Incline barbell bench press", 
    "Incline dumbbell bench press",
    "Dumbbell bench press",
    "Close grip bench press",
    "Pushup",
    "Incline pushup",
    "Dips",
    "Cable fly",
    "Dumbbell chest fly"
  ],
  back: [
    "Barbell bent over row",
    "T bar row",
    "Single arm dumbbell row",
    "Chest supported dumbbell high row",
    "Pullup",
    "Chin-up",
    "Lat pulldown neutral wide",
    "Lat pulldown, neutral",
    "Lat pulldown, pronated",
    "Lat pulldown, supinated",
    "Barbell deadlift", // Also heavily involves back
    "Trap bar deadlift"
  ],
  shoulders: [
    "Seated dumbbell overhead press",
    "Incline barbell bench press", // Secondary shoulder involvement
    "Incline dumbbell bench press", // Secondary shoulder involvement  
    "Pushup", // Secondary shoulder involvement
    "Dumbbell lateral raise",
    "Seated dumbbell lateral raise",
    "Lean in dumbbell lateral raise",
    "Single arm cable lateral raise",
    "Bent over dumbbell rear delt fly",
    "Cable rear delt fly",
    "Chest supported dumbbell rear delt fly"
  ],
  triceps: [
    "Seated dumbbell overhead press",
    "Barbell bench press",
    "Incline barbell bench press", 
    "Incline dumbbell bench press",
    "Dumbbell bench press",
    "Close grip bench press",
    "Pushup",
    "Incline pushup",
    "Dips",
    "Cable tricep pushdown, bar",
    "Cable overhead tricep press, bar",
    "Cable overhead tricep press, rope attachment",
    "Dumbbell skull crusher",
    "EZ bar skull crusher",
    "EZ bar overhead tricep press"
  ],
  biceps: [
    "Pullup",
    "Chin-up",
    "Barbell bent over row",
    "T bar row",
    "Single arm dumbbell row",
    "Chest supported dumbbell high row",
    "Barbell bicep curl",
    "Dumbbell bicep curl",
    "EZ bar bicep curl", 
    "Incline dumbbell bicep curl",
    "Incline dumbbell hammer curl",
    "Cable bicep curl, straight bar",
    "Single cable bicep curl",
    "Dual cable bicep curl"
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