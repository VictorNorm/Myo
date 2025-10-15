import { PrismaClient } from '@prisma/client';
import { calculateStartingWeights } from './beginnerWeightCalculator';
import logger from './logger';
import type { BeginnerQuestionnaireData, CreateBeginnerProgramRequest } from '../../types/beginnerProgram';

const prisma = new PrismaClient();

interface BeginnerProgramResponse {
  success: boolean;
  data?: any;
  message: string;
  validationErrors?: string[];
}

export const beginnerProgramService = {
  async processQuestionnaire(
    userId: number,
    questionnaireData: BeginnerQuestionnaireData
  ): Promise<BeginnerProgramResponse> {
    try {
      // Determine recommended templates based on available time
      const recommendedTemplateNames = questionnaireData.availableTime === '25-35' 
        ? ['Beginner Full Body - 4 Exercises'] 
        : ['Beginner Full Body - 6 Exercises'];

      // Fetch the recommended templates
      const templates = await prisma.program_templates.findMany({
        where: {
          name: { in: recommendedTemplateNames },
          is_active: true,
          difficulty_level: 'BEGINNER'
        },
        select: {
          id: true,
          name: true,
          description: true,
          frequency_per_week: true,
          category: true,
          goal: true
        }
      });

      if (templates.length === 0) {
        return {
          success: false,
          message: 'No suitable beginner templates found'
        };
      }

      logger.info('Processed beginner questionnaire', {
        userId,
        questionnaireData,
        recommendedTemplates: templates.map(t => t.name)
      });

      return {
        success: true,
        data: {
          recommendedTemplates: templates,
          userPreferences: {
            age: questionnaireData.age,
            gender: questionnaireData.gender,
            availableTime: questionnaireData.availableTime,
            frequency: questionnaireData.frequency
          }
        },
        message: 'Questionnaire processed successfully'
      };
    } catch (error) {
      logger.error('Error processing beginner questionnaire', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  },

  async createBeginnerProgram(
    userId: number,
    request: CreateBeginnerProgramRequest
  ): Promise<BeginnerProgramResponse> {
    try {
      // Fetch the template with all its workouts and exercises
      const template = await prisma.program_templates.findFirst({
        where: {
          id: request.templateId,
          is_active: true,
          difficulty_level: 'BEGINNER'
        },
        include: {
          template_workouts: {
            orderBy: { order: 'asc' },
            include: {
              template_exercises: {
                orderBy: { order: 'asc' },
                include: {
                  exercise: {
                    select: {
                      id: true,
                      name: true,
                      equipment: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!template) {
        return {
          success: false,
          message: 'Template not found'
        };
      }

      // Collect all exercises for weight calculation
      const allExercises = template.template_workouts.flatMap(workout =>
        workout.template_exercises.map(te => ({
          exerciseId: te.exercise_id,
          exerciseName: te.exercise.name
        }))
      );

      // Remove duplicates
      const uniqueExercises = allExercises.filter((exercise, index, self) => 
        index === self.findIndex(e => e.exerciseId === exercise.exerciseId)
      );

      // Calculate starting weights
      const exerciseWeights = await calculateStartingWeights(
        userId,
        uniqueExercises,
        request.questionnaireData.age,
        request.questionnaireData.gender
      );

      // Create weight mapping for easy lookup
      const weightMap = exerciseWeights.reduce((map, ew) => {
        map[ew.exerciseId] = ew.weight;
        return map;
      }, {} as Record<number, number>);

      // Create the program
      const programName = request.programName || `${template.name} - Personal`;
      const program = await prisma.programs.create({
        data: {
          name: programName,
          userId: userId,
          goal: template.goal,
          programType: 'AUTOMATED',
          status: 'PENDING',
          startDate: new Date()
        }
      });

      // Create workouts and exercises
      for (const templateWorkout of template.template_workouts) {
        const workout = await prisma.workouts.create({
          data: {
            name: templateWorkout.name,
            program_id: program.id
          }
        });

        // Create workout exercises with calculated weights
        for (const templateExercise of templateWorkout.template_exercises) {
          const calculatedWeight = weightMap[templateExercise.exercise_id] || 0;
          
          await prisma.workout_exercises.create({
            data: {
              workout_id: workout.id,
              exercise_id: templateExercise.exercise_id,
              sets: templateExercise.sets,
              reps: templateExercise.reps,
              weight: calculatedWeight,
              order: templateExercise.order
            }
          });
        }

        // Create supersets based on exercise order (A1/A2, B1/B2, C1/C2 pairs)
        const exercises = templateWorkout.template_exercises;
        for (let i = 0; i < exercises.length - 1; i += 2) {
          if (i + 1 < exercises.length) {
            await prisma.supersets.create({
              data: {
                workout_id: workout.id,
                first_exercise_id: exercises[i].exercise_id,
                second_exercise_id: exercises[i + 1].exercise_id,
                order: Math.floor(i / 2) + 1
              }
            });
          }
        }
      }

      // Update program status to ACTIVE
      await prisma.programs.update({
        where: { id: program.id },
        data: { status: 'ACTIVE' }
      });

      // Create program progression settings
      await prisma.program_progression_settings.create({
        data: {
          program_id: program.id,
          experienceLevel: 'BEGINNER',
          weeklyFrequency: request.questionnaireData.frequency
        }
      });

      logger.info('Created beginner program successfully', {
        userId,
        programId: program.id,
        templateId: request.templateId,
        exerciseCount: uniqueExercises.length
      });

      return {
        success: true,
        data: {
          programId: program.id,
          programName: program.name,
          status: program.status,
          exerciseWeights: exerciseWeights
        },
        message: 'Beginner program created successfully'
      };
    } catch (error) {
      logger.error('Error creating beginner program', {
        userId,
        templateId: request.templateId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }
};