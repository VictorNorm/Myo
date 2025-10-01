// Exercise Mapping Service
// Maps exercise names to database IDs for program generation

import prisma from "../services/db";
import logger from './logger';

// Cache for exercise name to ID mappings
let exerciseCache: Map<string, number> | null = null;

export const exerciseMappingService = {
  /**
   * Initialize exercise cache from database
   * Should be called on server startup or when needed
   */
  async initializeCache(): Promise<void> {
    try {
      const exercises = await prisma.exercises.findMany({
        select: {
          id: true,
          name: true
        }
      });

      exerciseCache = new Map(
        exercises.map((exercise: { name: any; id: any; }) => [exercise.name, exercise.id])
      );

      logger.info('Exercise cache initialized', {
        exerciseCount: exercises.length
      });

    } catch (error) {
      logger.error('Failed to initialize exercise cache', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  },

  /**
   * Get exercise ID by name
   * @param exerciseName - Exact exercise name from database
   * @returns Exercise ID or null if not found
   */
  async getExerciseIdByName(exerciseName: string): Promise<number | null> {
    // Initialize cache if not already done
    if (!exerciseCache) {
      await this.initializeCache();
    }

    const exerciseId = exerciseCache!.get(exerciseName);
    
    if (!exerciseId) {
      logger.warn('Exercise not found in database', {
        exerciseName,
        availableExercises: Array.from(exerciseCache!.keys()).slice(0, 10) // Log first 10 for debugging
      });
      return null;
    }

    return exerciseId;
  },

  /**
   * Get multiple exercise IDs by names
   * @param exerciseNames - Array of exercise names
   * @returns Map of exercise name to ID, only including found exercises
   */
  async getMultipleExerciseIds(exerciseNames: string[]): Promise<Map<string, number>> {
    const exerciseMap = new Map<string, number>();
    const notFound: string[] = [];

    for (const exerciseName of exerciseNames) {
      const exerciseId = await this.getExerciseIdByName(exerciseName);
      if (exerciseId) {
        exerciseMap.set(exerciseName, exerciseId);
      } else {
        notFound.push(exerciseName);
      }
    }

    if (notFound.length > 0) {
      logger.warn('Some exercises not found in database', {
        notFound,
        found: exerciseMap.size,
        total: exerciseNames.length
      });
    }

    return exerciseMap;
  },

  /**
   * Validate that all exercise names exist in database
   * @param exerciseNames - Array of exercise names to validate
   * @returns Object with validation result and missing exercises
   */
  async validateExerciseNames(exerciseNames: string[]): Promise<{
    valid: boolean;
    missing: string[];
    found: string[];
  }> {
    const exerciseMap = await this.getMultipleExerciseIds(exerciseNames);
    const found = Array.from(exerciseMap.keys());
    const missing = exerciseNames.filter(name => !exerciseMap.has(name));

    return {
      valid: missing.length === 0,
      missing,
      found
    };
  },

  /**
   * Get all available exercise names from cache
   * Useful for debugging and validation
   */
  getAvailableExerciseNames(): string[] {
    if (!exerciseCache) {
      logger.warn('Exercise cache not initialized');
      return [];
    }
    
    return Array.from(exerciseCache.keys()).sort();
  },

  /**
   * Force refresh the exercise cache
   * Use when exercises are added/modified in database
   */
  async refreshCache(): Promise<void> {
    exerciseCache = null;
    await this.initializeCache();
  }
};