// Updated programGenerationService.ts with complete exercise handling

import { generateProgram } from './programGenerator';
import { programService, CreateProgramWithWorkoutsRequest } from './programService';
import { exerciseMappingService } from './exerciseMappingService';
import prisma from '../services/db';
import logger from './logger';
import { 
  UserPreferences, 
  ProgramGenerationRequest, 
  ProgramGenerationResponse, 
  GeneratedProgram,
  SupersetStructure 
} from '../types/programGeneration';
import { 
  validatePreferences, 
  getRecommendedDefaults 
} from '../utils/programGenerationHelpers';

export const programGenerationService = {
  /**
   * Generate and create a program based on user preferences
   * @param request - Program generation request with user preferences
   * @returns Response with created program details
   */
  async generateProgramFromPreferences(
    request: ProgramGenerationRequest
  ): Promise<ProgramGenerationResponse> {
    try {
      // Validate preferences
      const validation = validatePreferences(request.preferences);
      if (!validation.valid) {
        logger.warn('Invalid program generation preferences', {
          userId: request.userId,
          errors: validation.errors,
          preferences: request.preferences
        });

        return {
          success: false,
          message: 'Invalid preferences provided',
          validationErrors: validation.errors
        };
      }

      // Generate the program structure
      logger.info('Generating program from preferences', {
        userId: request.userId,
        preferences: request.preferences
      });

      const generatedProgram = generateProgram(request.preferences);

      // Convert generated program to database format (basic program + workouts)
      const programRequest = await convertToCreateProgramRequest(
        generatedProgram,
        request.userId,
        request.programName
      );

      // Create the program and workouts (without exercises initially)
      const createdProgram = await programService.createProgramWithWorkouts(
        request.userId,
        false, // isAdmin - user creating their own program
        programRequest
      );

      // Now add exercises to the created workouts
      await addExercisesToProgram(createdProgram.id, generatedProgram);

      logger.info('Successfully generated and created program with exercises', {
        userId: request.userId,
        programId: createdProgram.id,
        programType: generatedProgram.type,
        workoutCount: generatedProgram.workouts.length
      });

      return {
        success: true,
        program: generatedProgram,
        programId: createdProgram.id,
        message: 'Program generated and created successfully'
      };

    } catch (error) {
      logger.error(`Error generating program: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        userId: request.userId,
        preferences: request.preferences
      });

      return {
        success: false,
        message: 'Failed to generate program',
        validationErrors: error instanceof Error ? [error.message] : ['Unknown error occurred']
      };
    }
  },

  /**
   * Generate a quick setup program for beginners
   * @param userId - User ID
   * @param experience - User experience level
   * @returns Generated program response
   */
  async generateQuickSetupProgram(
    userId: number, 
    experience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' = 'BEGINNER'
  ): Promise<ProgramGenerationResponse> {
    try {
      // Get recommended defaults for experience level
      const defaults = getRecommendedDefaults(experience);
      
      const preferences: UserPreferences = {
        ...defaults,
        experience
      };

      const request: ProgramGenerationRequest = {
        preferences,
        userId,
        programName: `${experience.toLowerCase().charAt(0).toUpperCase() + experience.toLowerCase().slice(1)} Quick Start Program`
      };

      logger.info('Generating quick setup program', {
        userId,
        experience,
        preferences
      });

      return await this.generateProgramFromPreferences(request);

    } catch (error) {
      logger.error(`Error generating quick setup program: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        experience
      });

      return {
        success: false,
        message: 'Failed to generate quick setup program',
        validationErrors: error instanceof Error ? [error.message] : ['Unknown error occurred']
      };
    }
  },

  /**
   * Preview a program without creating it in the database
   * @param preferences - User preferences
   * @returns Generated program preview
   */
  async previewProgram(preferences: UserPreferences): Promise<ProgramGenerationResponse> {
    try {
      // Validate preferences
      const validation = validatePreferences(preferences);
      if (!validation.valid) {
        return {
          success: false,
          message: 'Invalid preferences provided',
          validationErrors: validation.errors
        };
      }

      // Validate that all exercise names exist in database
      const generatedProgram = generateProgram(preferences);
      const allExerciseNames = extractAllExerciseNames(generatedProgram);
      
      const exerciseValidation = await exerciseMappingService.validateExerciseNames(allExerciseNames);
      if (!exerciseValidation.valid) {
        logger.warn('Program preview contains invalid exercise names', {
          missing: exerciseValidation.missing,
          found: exerciseValidation.found
        });
        
        return {
          success: false,
          message: 'Some exercises in generated program are not available in database',
          validationErrors: exerciseValidation.missing.map(name => `Exercise not found: ${name}`)
        };
      }

      logger.debug('Generated program preview', {
        programType: generatedProgram.type,
        workoutCount: generatedProgram.workouts.length,
        preferences
      });

      return {
        success: true,
        program: generatedProgram,
        message: 'Program preview generated successfully'
      };

    } catch (error) {
      logger.error(`Error previewing program: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        preferences
      });

      return {
        success: false,
        message: 'Failed to generate program preview',
        validationErrors: error instanceof Error ? [error.message] : ['Unknown error occurred']
      };
    }
  },

  /**
   * Get recommended preferences for a user based on their experience
   * @param experience - User experience level
   * @returns Recommended preferences
   */
  getRecommendedPreferences(experience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'): UserPreferences {
    return {
      ...getRecommendedDefaults(experience),
      experience
    };
  }
};

/**
 * Convert generated program to format expected by existing program service
 * @param generatedProgram - Generated program structure
 * @param userId - User ID
 * @param programName - Optional custom program name
 * @returns Program creation request
 */
async function convertToCreateProgramRequest(
  generatedProgram: GeneratedProgram,
  userId: number,
  programName?: string
): Promise<CreateProgramWithWorkoutsRequest> {
  // Calculate start and end dates
  const startDate = new Date().toISOString().split('T')[0]; // Today
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + (12 * 7)); // 12 weeks from now
  
  // Generate program name if not provided
  const defaultName = `${generatedProgram.type.replace('_', ' ')} - ${generatedProgram.goal} Program`;
  
  return {
    name: programName || defaultName,
    userId,
    goal: generatedProgram.goal,
    programType: 'AUTOMATED', // Generated programs are automated
    startDate,
    endDate: endDate.toISOString().split('T')[0],
    workouts: generatedProgram.workouts.map((workout: any) => ({
      name: workout.name
    })),
    shouldActivate: true // Activate the program immediately
  };
}

/**
 * Add exercises to created program workouts
 * @param programId - Created program ID
 * @param generatedProgram - Generated program structure with exercises
 */
async function addExercisesToProgram(
  programId: number,
  generatedProgram: GeneratedProgram
): Promise<void> {
  try {
    // Get the created workouts from the database
    const createdWorkouts = await prisma.workouts.findMany({
      where: { program_id: programId },
      orderBy: { id: 'asc' }
    });

    if (createdWorkouts.length !== generatedProgram.workouts.length) {
      throw new Error(`Workout count mismatch: created ${createdWorkouts.length}, expected ${generatedProgram.workouts.length}`);
    }

    // Initialize exercise cache if needed
    await exerciseMappingService.initializeCache();

    // Process each workout
    for (let i = 0; i < generatedProgram.workouts.length; i++) {
      const generatedWorkout = generatedProgram.workouts[i];
      const createdWorkout = createdWorkouts[i];

      // Extract exercises from superset structure
      const exercises = extractExercisesFromSupersets(generatedWorkout.exercises);
      
      if (exercises.length === 0) {
        logger.warn('No exercises found in generated workout', {
          workoutName: generatedWorkout.name,
          workoutId: createdWorkout.id
        });
        continue;
      }

      // Get exercise IDs for all exercises in this workout
      const exerciseNames = exercises.map(ex => ex.name);
      const exerciseMap = await exerciseMappingService.getMultipleExerciseIds(exerciseNames);

      // Prepare workout_exercises data
      const workoutExercisesToCreate = [];
      for (const exercise of exercises) {
        const exerciseId = exerciseMap.get(exercise.name);
        
        if (!exerciseId) {
          logger.error('Exercise not found in database', {
            exerciseName: exercise.name,
            workoutName: generatedWorkout.name
          });
          throw new Error(`Exercise "${exercise.name}" not found in database`);
        }

        // Parse reps (convert "8-10" to middle value, e.g., 9)
        const reps = parseRepsFromRange(exercise.reps);

        workoutExercisesToCreate.push({
          workout_id: createdWorkout.id,
          exercise_id: exerciseId,
          sets: exercise.sets,
          reps: reps,
          weight: exercise.weight || 0,
          order: exercise.order
        });
      }

      // Create all exercises for this workout
      if (workoutExercisesToCreate.length > 0) {
        await prisma.workout_exercises.createMany({
          data: workoutExercisesToCreate
        });

        logger.info('Added exercises to workout', {
          workoutId: createdWorkout.id,
          workoutName: generatedWorkout.name,
          exerciseCount: workoutExercisesToCreate.length
        });
      }
    }

    logger.info('Successfully added all exercises to program', {
      programId,
      workoutCount: createdWorkouts.length,
      totalExercises: generatedProgram.workouts.reduce((sum, w) => 
        sum + extractExercisesFromSupersets(w.exercises).length, 0
      )
    });

  } catch (error) {
    logger.error('Failed to add exercises to program', {
      programId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Helper function to extract exercises from superset structure
 * @param supersets - Superset structures
 * @returns Flat array of exercises with their details
 */
function extractExercisesFromSupersets(supersets: SupersetStructure[]) {
  const exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    order: number;
    weight?: number;
  }> = [];

  let order = 1;

  for (const superset of supersets) {
    if (superset.type === 'single') {
      // Single exercise
      const exercise = superset.exercises[0];
      exercises.push({
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        order,
        weight: exercise.weight
      });
      order++;
    } else {
      // Superset - pair the exercises
      for (const exercise of superset.exercises) {
        exercises.push({
          name: exercise.name,
          sets: exercise.sets,
          reps: exercise.reps,
          order,
          weight: exercise.weight
        });
      }
      order++;
    }
  }

  return exercises;
}

/**
 * Extract all unique exercise names from generated program
 * @param program - Generated program
 * @returns Array of unique exercise names
 */
function extractAllExerciseNames(program: GeneratedProgram): string[] {
  const exerciseNames = new Set<string>();
  
  for (const workout of program.workouts) {
    const exercises = extractExercisesFromSupersets(workout.exercises);
    for (const exercise of exercises) {
      exerciseNames.add(exercise.name);
    }
  }
  
  return Array.from(exerciseNames);
}

/**
 * Parse rep range string to middle value
 * @param repsRange - Rep range like "8-10" or "12"
 * @returns Middle rep value as integer
 */
function parseRepsFromRange(repsRange: string): number {
  if (repsRange.includes('-')) {
    const [min, max] = repsRange.split('-').map(r => parseInt(r.trim()));
    return Math.round((min + max) / 2);
  }
  return parseInt(repsRange);
}