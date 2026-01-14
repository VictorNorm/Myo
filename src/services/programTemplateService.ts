import { programTemplateRepository } from "./repositories/programTemplateRepository";
import { programRepository } from "./repositories/programRepository";
import prisma from "./db";
import logger from "./logger";
import type {
  ProgramTemplateBasic,
  ProgramTemplateWithWorkouts,
  TemplateFilters,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  CreateProgramFromTemplateRequest,
  CreateProgramFromTemplateResponse,
  DifficultyLevel,
  ProgramCategory
} from "../../types/programTemplates";
import type { ProgramWithCounts } from "./repositories/programRepository";

// Default weights by equipment type (in kg)
const getDefaultWeightByEquipment = (equipment: string): number => {
  const defaults: Record<string, number> = {
    'BARBELL': 20,      // Empty Olympic bar
    'DUMBBELL': 5,      // Light starting pair (per hand)
    'CABLE': 10,        // Low stack position
    'MACHINE': 20,      // Conservative machine start
    'BODYWEIGHT': 0,    // Just bodyweight
  };
  return defaults[equipment] ?? 0;
};

export const programTemplateService = {
  // Get all available templates
  async getAllTemplates(): Promise<ProgramTemplateBasic[]> {
    try {
      const templates = await programTemplateRepository.findAllTemplates();
      
      logger.info('Retrieved all program templates', {
        count: templates.length
      });
      
      return templates;
    } catch (error) {
      logger.error(`Error retrieving program templates: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  },

  // Get templates filtered by category, difficulty, etc.
  async getTemplatesByFilters(filters: TemplateFilters): Promise<ProgramTemplateBasic[]> {
    try {
      const templates = await programTemplateRepository.findTemplatesByFilters(filters);
      
      logger.info('Retrieved filtered program templates', {
        count: templates.length,
        filters: filters
      });
      
      return templates;
    } catch (error) {
      logger.error(`Error retrieving filtered templates: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        filters: filters
      });
      throw error;
    }
  },

  // Get specific template with full details including workouts and exercises
  async getTemplateDetails(templateId: number): Promise<ProgramTemplateWithWorkouts> {
    try {
      const template = await programTemplateRepository.findTemplateWithWorkouts(templateId);
      
      if (!template) {
        throw new Error('Template not found');
      }

      if (!template.is_active) {
        throw new Error('Template is no longer available');
      }
      
      logger.info('Retrieved template details', {
        templateId: templateId,
        templateName: template.name,
        workoutCount: template.template_workouts.length
      });
      
      return template;
    } catch (error) {
      logger.error(`Error retrieving template details: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        templateId: templateId
      });
      throw error;
    }
  },

  // Convert template to actual user program
  async createProgramFromTemplate(
    templateId: number, 
    userId: number, 
    programData: CreateProgramFromTemplateRequest
  ): Promise<CreateProgramFromTemplateResponse> {
    try {
      // Get the template with all workouts and exercises
      const template = await this.getTemplateDetails(templateId);
      
      if (!template) {
        throw new Error('Template not found');
      }

      let totalExercisesCreated = 0;

      // Create the program using transaction
      const program = await programRepository.createWithWorkouts({
        name: programData.name,
        userId: userId,
        goal: template.goal,
        programType: template.program_type as "MANUAL" | "AUTOMATED",
        startDate: programData.start_date || new Date(),
        weeklyFrequency: template.frequency_per_week,
        workouts: template.template_workouts.map(workout => ({
          name: workout.name
        })),
        shouldActivate: false // Don't auto-activate programs created from templates
      });

      // Get the created workouts to add exercises
      const createdWorkouts = await prisma.workouts.findMany({
        where: { program_id: program.id },
        orderBy: { id: 'asc' }
      });

      // Add exercises to each workout
      for (let i = 0; i < template.template_workouts.length; i++) {
        const templateWorkout = template.template_workouts[i];
        const createdWorkout = createdWorkouts[i];
        
        if (createdWorkout && templateWorkout.template_exercises.length > 0) {
          const exercisesToCreate = templateWorkout.template_exercises.map(exercise => ({
            workout_id: createdWorkout.id,
            exercise_id: exercise.exercise_id,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight > 0
              ? exercise.weight
              : getDefaultWeightByEquipment(exercise.exercise?.equipment || 'DUMBBELL'),
            order: exercise.order
          }));

          await prisma.workout_exercises.createMany({
            data: exercisesToCreate
          });

          totalExercisesCreated += exercisesToCreate.length;
        }
      }

      logger.info('Successfully created program from template', {
        templateId: templateId,
        templateName: template.name,
        programId: program.id,
        programName: programData.name,
        userId: userId,
        workoutsCreated: template.template_workouts.length,
        exercisesCreated: totalExercisesCreated
      });

      return {
        success: true,
        data: {
          program_id: program.id,
          program_name: program.name,
          workouts_created: template.template_workouts.length,
          exercises_created: totalExercisesCreated
        },
        message: 'Program created successfully from template'
      };

    } catch (error) {
      logger.error(`Error creating program from template: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        templateId: templateId,
        userId: userId,
        programData: programData
      });
      throw error;
    }
  },

  // Create new template (admin only)
  async createTemplate(adminUserId: number, templateData: CreateTemplateRequest): Promise<ProgramTemplateWithWorkouts> {
    try {
      // Validate template data
      if (!templateData.name || templateData.name.trim() === '') {
        throw new Error('Template name is required');
      }

      if (!templateData.template_workouts || templateData.template_workouts.length === 0) {
        throw new Error('At least one workout is required');
      }

      // Validate each workout has exercises
      for (const workout of templateData.template_workouts) {
        if (!workout.template_exercises || workout.template_exercises.length === 0) {
          throw new Error(`Workout "${workout.name}" must have at least one exercise`);
        }
      }

      const template = await programTemplateRepository.createTemplate(templateData);
      
      logger.info('Created new program template', {
        templateId: template.id,
        templateName: template.name,
        adminUserId: adminUserId,
        workoutCount: template.template_workouts.length
      });
      
      return template;
    } catch (error) {
      logger.error(`Error creating template: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        adminUserId: adminUserId,
        templateName: templateData.name
      });
      throw error;
    }
  },

  // Update existing template (admin only)
  async updateTemplate(templateId: number, updateData: UpdateTemplateRequest): Promise<ProgramTemplateBasic> {
    try {
      // Verify template exists
      const exists = await programTemplateRepository.verifyTemplateExists(templateId);
      if (!exists) {
        throw new Error('Template not found');
      }

      const updatedTemplate = await programTemplateRepository.updateTemplate(templateId, updateData);
      
      if (!updatedTemplate) {
        throw new Error('Failed to update template');
      }

      logger.info('Updated program template', {
        templateId: templateId,
        updateData: updateData
      });
      
      return updatedTemplate;
    } catch (error) {
      logger.error(`Error updating template: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        templateId: templateId,
        updateData: updateData
      });
      throw error;
    }
  },

  // Deactivate template (soft delete, admin only)
  async deactivateTemplate(templateId: number): Promise<ProgramTemplateBasic> {
    try {
      const deactivatedTemplate = await programTemplateRepository.deactivateTemplate(templateId);
      
      if (!deactivatedTemplate) {
        throw new Error('Template not found');
      }

      logger.info('Deactivated program template', {
        templateId: templateId,
        templateName: deactivatedTemplate.name
      });
      
      return deactivatedTemplate;
    } catch (error) {
      logger.error(`Error deactivating template: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        templateId: templateId
      });
      throw error;
    }
  },

  // Get templates by category
  async getTemplatesByCategory(category: ProgramCategory): Promise<ProgramTemplateBasic[]> {
    try {
      const templates = await programTemplateRepository.findTemplatesByCategory(category);
      
      logger.info('Retrieved templates by category', {
        category: category,
        count: templates.length
      });
      
      return templates;
    } catch (error) {
      logger.error(`Error retrieving templates by category: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        category: category
      });
      throw error;
    }
  },

  // Get templates by difficulty level
  async getTemplatesByDifficulty(difficulty: DifficultyLevel): Promise<ProgramTemplateBasic[]> {
    try {
      const templates = await programTemplateRepository.findTemplatesByDifficulty(difficulty);
      
      logger.info('Retrieved templates by difficulty', {
        difficulty: difficulty,
        count: templates.length
      });
      
      return templates;
    } catch (error) {
      logger.error(`Error retrieving templates by difficulty: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        stack: error instanceof Error ? error.stack : undefined,
        difficulty: difficulty
      });
      throw error;
    }
  },

  // Verify template exists and is active
  async verifyTemplateActive(templateId: number): Promise<boolean> {
    return programTemplateRepository.verifyTemplateActive(templateId);
  },
};