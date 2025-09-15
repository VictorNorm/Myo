// Program Generation Service
// Integrates program generation algorithm with existing program creation system

import { generateProgram } from './programGenerator';
import { programService, CreateProgramWithWorkoutsRequest } from './programService';
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

      // Convert generated program to database format
      const programRequest = await convertToCreateProgramRequest(
        generatedProgram,
        request.userId,
        request.programName
      );

      // Create the program in the database
      const createdProgram = await programService.createProgramWithWorkouts(
        request.userId,
        false, // isAdmin - user creating their own program
        programRequest
      );

      logger.info('Successfully generated and created program', {
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

      // Generate the program structure
      const generatedProgram = generateProgram(preferences);

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
 * Helper function to extract exercises from superset structure
 * This would be used when creating workout_exercises records
 * @param supersets - Superset structures
 * @returns Flat array of exercises with their details
 */
function extractExercisesFromSupersets(supersets: SupersetStructure[]) {
  const exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    order: number;
    isSuperset: boolean;
    supersetPartner?: string;
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
        isSuperset: false
      });
      order++;
    } else {
      // Superset - pair the exercises
      const [first, second] = superset.exercises;
      
      exercises.push({
        name: first.name,
        sets: first.sets,
        reps: first.reps,
        order,
        isSuperset: true,
        supersetPartner: second.name
      });
      
      exercises.push({
        name: second.name,
        sets: second.sets,
        reps: second.reps,
        order,
        isSuperset: true,
        supersetPartner: first.name
      });
      
      order++;
    }
  }

  return exercises;
}