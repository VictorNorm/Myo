// Program Template Types

import type { DifficultyLevel as PrismaDifficultyLevel, ProgramCategory as PrismaProgramCategory, Goal as PrismaGoal, ProgramType as PrismaProgramType } from '@prisma/client';

export type DifficultyLevel = PrismaDifficultyLevel;
export type ProgramCategory = PrismaProgramCategory;
export type Goal = PrismaGoal;
export type ProgramType = PrismaProgramType;

// Basic template info for listings
export interface ProgramTemplateBasic {
  id: number;
  name: string;
  description: string | null;
  difficulty_level: DifficultyLevel;
  frequency_per_week: number;
  category: ProgramCategory;
  goal: Goal;
  program_type: ProgramType;
  duration_weeks: number | null;
  is_active: boolean;
  created_by_admin: boolean;
  created_at: Date;
  updated_at: Date;
}

// Individual exercise within a workout template
export interface TemplateExerciseData {
  id: number;
  template_workout_id: number;
  exercise_id: number;
  sets: number;
  reps: number;
  weight: any | null; // Using any to handle Prisma Decimal type
  order: number;
  notes: string | null;
  // Include exercise details for display
  exercise: {
    id: number;
    name: string;
    equipment: string;
    category: string;
  };
}

// Individual workout within a template
export interface TemplateWorkoutData {
  id: number;
  template_id: number;
  name: string;
  order: number;
  created_at: Date;
  template_exercises: TemplateExerciseData[];
}

// Full template with all workouts and exercises
export interface ProgramTemplateWithWorkouts {
  id: number;
  name: string;
  description: string | null;
  difficulty_level: DifficultyLevel;
  frequency_per_week: number;
  category: ProgramCategory;
  goal: Goal;
  program_type: ProgramType;
  duration_weeks: number | null;
  is_active: boolean;
  created_by_admin: boolean;
  created_at: Date;
  updated_at: Date;
  template_workouts: TemplateWorkoutData[];
}

// Data for creating a new template (admin only)
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  difficulty_level: DifficultyLevel;
  frequency_per_week: number;
  category: ProgramCategory;
  goal: Goal;
  program_type: ProgramType;
  duration_weeks?: number;
  template_workouts: CreateTemplateWorkoutRequest[];
}

// Workout data for creating template
export interface CreateTemplateWorkoutRequest {
  name: string;
  order: number;
  template_exercises: CreateTemplateExerciseRequest[];
}

// Exercise data for creating template
export interface CreateTemplateExerciseRequest {
  exercise_id: number;
  sets: number;
  reps: number;
  weight?: number;
  order: number;
  notes?: string;
}

// Data for updating an existing template
export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  difficulty_level?: DifficultyLevel;
  frequency_per_week?: number;
  category?: ProgramCategory;
  goal?: Goal;
  program_type?: ProgramType;
  duration_weeks?: number;
  is_active?: boolean;
}

// Data for creating a program from a template
export interface CreateProgramFromTemplateRequest {
  name: string;
  start_date?: Date;
}

// Template filters for search/browse
export interface TemplateFilters {
  category?: ProgramCategory;
  difficulty?: DifficultyLevel;
  goal?: Goal;
  frequency_per_week?: number;
  program_type?: ProgramType;
}

// Template recommendation input (for future recommendation feature)
export interface TemplateRecommendationRequest {
  experience_level?: DifficultyLevel;
  goal?: Goal;
  available_days_per_week?: number;
  preferred_duration_weeks?: number;
  equipment_preferences?: string[];
}

// Response types for API
export interface TemplateListResponse {
  success: boolean;
  data: ProgramTemplateBasic[];
  message: string;
}

export interface TemplateDetailResponse {
  success: boolean;
  data: ProgramTemplateWithWorkouts;
  message: string;
}

export interface CreateProgramFromTemplateResponse {
  success: boolean;
  data: {
    program_id: number;
    program_name: string;
    workouts_created: number;
    exercises_created: number;
  };
  message: string;
}