// TypeScript interfaces for program generation

export interface UserPreferences {
  frequency: number; // 2-6 days per week
  goal: 'STRENGTH' | 'HYPERTROPHY';
  experience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  sessionTime: number; // Minutes (25-120)
  exerciseCount: number; // 3-6 exercises per session
  setsPerExercise: number; // 2-4 sets per exercise
  focusMuscleGroups?: number[]; // Optional array of muscle group IDs to focus on
}

export interface VolumeAllocation {
  exercise: string;
  recommendedSets: number;
  reason: string;
}

export interface ProgramGenerationRequest {
  preferences: UserPreferences;
  userId: number;
  programName?: string;
}

export interface ExerciseAllocation {
  name: string;
  sets: number;
  reps: string; // Rep range like "6-8" or "8-12"
  weight?: number; // Optional starting weight suggestion
  notes?: string; // Optional exercise notes
}

export interface SupersetStructure {
  type: 'superset' | 'single';
  exercises: ExerciseAllocation[];
}

export interface GeneratedWorkout {
  name: string;
  order?: number;
  exercises: SupersetStructure[];
  estimatedDuration?: number; // In minutes
}

export interface GeneratedProgram {
  type: 'FULL_BODY' | 'UPPER_LOWER' | 'PPL';
  frequency: number;
  goal: 'STRENGTH' | 'HYPERTROPHY';
  workouts: GeneratedWorkout[];
  totalEstimatedTime?: number; // Total weekly time in minutes
  volumeAnalysis?: {
    totalSets: number;
    muscleGroupDistribution: Record<string, number>;
    warnings?: string[];
  };
}

export interface ProgramGenerationResponse {
  success: boolean;
  program?: GeneratedProgram;
  programId?: number; // ID of created program in database
  message: string;
  validationErrors?: string[];
}

// For progression suggestions (future enhancement)
export interface ProgressionSuggestion {
  type: 'EXPERIENCE_UPGRADE' | 'FREQUENCY_INCREASE' | 'VOLUME_INCREASE';
  title: string;
  description: string;
  benefits: string[];
  action: string;
  currentValue?: string | number;
  suggestedValue?: string | number;
}

// For quick setup functionality
export interface QuickSetupPreferences {
  experience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  goal: 'STRENGTH' | 'HYPERTROPHY';
  availableTime: 'SHORT' | 'MEDIUM' | 'LONG'; // Maps to session times
}

export interface QuickSetupProgram extends GeneratedProgram {
  isQuickSetup: true;
  setupType: QuickSetupPreferences;
}

// For exercise selection and filtering
export interface ExerciseSelectionCriteria {
  patterns: string[]; // Movement patterns to include
  equipment: string[]; // Equipment types available
  experience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  excludeExercises?: string[]; // Exercises to avoid
  prioritizeCompound?: boolean; // Whether to prioritize compound movements
}

// For superset pairing logic
export interface SupersetPairingResult {
  pairing: string[]; // Array of exercise names
  valid: boolean;
  conflicts: string[];
  compatibilityScore: number; // 0-1 score of how well they pair
}

// For volume management
export interface MuscleGroupVolume {
  muscleGroup: string;
  totalSets: number;
  exercises: string[];
  isOverVolume: boolean;
  recommendedAdjustment?: string;
}

export interface VolumeAnalysis {
  totalWorkoutSets: number;
  muscleGroups: MuscleGroupVolume[];
  warnings: string[];
  suggestions: string[];
  isOptimal: boolean;
}

// For API validation
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

// Export type guards for runtime validation
export const isValidGoal = (goal: any): goal is 'STRENGTH' | 'HYPERTROPHY' => {
  return goal === 'STRENGTH' || goal === 'HYPERTROPHY';
};

export const isValidExperience = (experience: any): experience is 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' => {
  return experience === 'BEGINNER' || experience === 'INTERMEDIATE' || experience === 'ADVANCED';
};

export const isValidFrequency = (frequency: any): frequency is number => {
  return typeof frequency === 'number' && frequency >= 2 && frequency <= 6;
};

export const isValidSessionTime = (sessionTime: any): sessionTime is number => {
  return typeof sessionTime === 'number' && sessionTime >= 25 && sessionTime <= 120;
};

export const isValidExerciseCount = (exerciseCount: any): exerciseCount is number => {
  return typeof exerciseCount === 'number' && exerciseCount >= 3 && exerciseCount <= 6;
};

export const isValidSetsPerExercise = (setsPerExercise: any): setsPerExercise is number => {
  return typeof setsPerExercise === 'number' && setsPerExercise >= 2 && setsPerExercise <= 4;
};