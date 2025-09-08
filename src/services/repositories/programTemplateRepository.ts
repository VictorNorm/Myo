import prisma, { withRetry } from "../db";
import type {
  ProgramTemplateBasic,
  ProgramTemplateWithWorkouts,
  TemplateFilters,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  DifficultyLevel,
  ProgramCategory
} from "../../../types/programTemplates";

export const programTemplateRepository = {
  async findAllTemplates(): Promise<ProgramTemplateBasic[]> {
    return withRetry(async () => {
      return prisma.program_templates.findMany({
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          description: true,
          difficulty_level: true,
          frequency_per_week: true,
          category: true,
          goal: true,
          program_type: true,
          duration_weeks: true,
          is_active: true,
          created_by_admin: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: [
          { difficulty_level: 'asc' },
          { name: 'asc' }
        ]
      });
    });
  },

  async findTemplatesByFilters(filters: TemplateFilters): Promise<ProgramTemplateBasic[]> {
    const whereClause: any = { is_active: true };

    if (filters.category) {
      whereClause.category = filters.category;
    }
    if (filters.difficulty) {
      whereClause.difficulty_level = filters.difficulty;
    }
    if (filters.goal) {
      whereClause.goal = filters.goal;
    }
    if (filters.frequency_per_week) {
      whereClause.frequency_per_week = filters.frequency_per_week;
    }
    if (filters.program_type) {
      whereClause.program_type = filters.program_type;
    }

    return withRetry(async () => {
      return prisma.program_templates.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          description: true,
          difficulty_level: true,
          frequency_per_week: true,
          category: true,
          goal: true,
          program_type: true,
          duration_weeks: true,
          is_active: true,
          created_by_admin: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: [
          { difficulty_level: 'asc' },
          { name: 'asc' }
        ]
      });
    });
  },

  async findTemplateById(templateId: number): Promise<ProgramTemplateBasic | null> {
    return withRetry(async () => {
      return prisma.program_templates.findUnique({
        where: { id: templateId },
        select: {
          id: true,
          name: true,
          description: true,
          difficulty_level: true,
          frequency_per_week: true,
          category: true,
          goal: true,
          program_type: true,
          duration_weeks: true,
          is_active: true,
          created_by_admin: true,
          created_at: true,
          updated_at: true,
        }
      });
    });
  },

  async findTemplateWithWorkouts(templateId: number): Promise<ProgramTemplateWithWorkouts | null> {
    return withRetry(async () => {
      return prisma.program_templates.findUnique({
        where: { id: templateId },
        include: {
          template_workouts: {
            include: {
              template_exercises: {
                include: {
                  exercise: {
                    select: {
                      id: true,
                      name: true,
                      equipment: true,
                      category: true,
                    }
                  }
                },
                orderBy: { order: 'asc' }
              }
            },
            orderBy: { order: 'asc' }
          }
        }
      });
    });
  },

  async findTemplatesByCategory(category: ProgramCategory): Promise<ProgramTemplateBasic[]> {
    return withRetry(async () => {
      return prisma.program_templates.findMany({
        where: { 
          category: category,
          is_active: true 
        },
        select: {
          id: true,
          name: true,
          description: true,
          difficulty_level: true,
          frequency_per_week: true,
          category: true,
          goal: true,
          program_type: true,
          duration_weeks: true,
          is_active: true,
          created_by_admin: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: [
          { difficulty_level: 'asc' },
          { name: 'asc' }
        ]
      });
    });
  },

  async findTemplatesByDifficulty(difficulty: DifficultyLevel): Promise<ProgramTemplateBasic[]> {
    return withRetry(async () => {
      return prisma.program_templates.findMany({
        where: { 
          difficulty_level: difficulty,
          is_active: true 
        },
        select: {
          id: true,
          name: true,
          description: true,
          difficulty_level: true,
          frequency_per_week: true,
          category: true,
          goal: true,
          program_type: true,
          duration_weeks: true,
          is_active: true,
          created_by_admin: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: [
          { name: 'asc' }
        ]
      });
    });
  },

  async createTemplate(data: CreateTemplateRequest): Promise<ProgramTemplateWithWorkouts> {
    return withRetry(async () => {
      return prisma.$transaction(async (tx) => {
        // Create the template
        const template = await tx.program_templates.create({
          data: {
            name: data.name,
            description: data.description,
            difficulty_level: data.difficulty_level,
            frequency_per_week: data.frequency_per_week,
            category: data.category,
            goal: data.goal,
            program_type: data.program_type,
            duration_weeks: data.duration_weeks,
            is_active: true,
            created_by_admin: true,
          }
        });

        // Create template workouts
        for (const workoutData of data.template_workouts) {
          const workout = await tx.template_workouts.create({
            data: {
              template_id: template.id,
              name: workoutData.name,
              order: workoutData.order,
            }
          });

          // Create template exercises for this workout
          const exerciseData = workoutData.template_exercises.map(exercise => ({
            template_workout_id: workout.id,
            exercise_id: exercise.exercise_id,
            sets: exercise.sets,
            reps: exercise.reps,
            weight: exercise.weight,
            order: exercise.order,
            notes: exercise.notes,
          }));

          await tx.template_exercises.createMany({
            data: exerciseData
          });
        }

        // Return the complete template with workouts
        return tx.program_templates.findUnique({
          where: { id: template.id },
          include: {
            template_workouts: {
              include: {
                template_exercises: {
                  include: {
                    exercise: {
                      select: {
                        id: true,
                        name: true,
                        equipment: true,
                        category: true,
                      }
                    }
                  },
                  orderBy: { order: 'asc' }
                }
              },
              orderBy: { order: 'asc' }
            }
          }
        }) as Promise<ProgramTemplateWithWorkouts>;
      });
    });
  },

  async updateTemplate(templateId: number, data: UpdateTemplateRequest): Promise<ProgramTemplateBasic | null> {
    return withRetry(async () => {
      const updateData: any = {};
      
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.difficulty_level !== undefined) updateData.difficulty_level = data.difficulty_level;
      if (data.frequency_per_week !== undefined) updateData.frequency_per_week = data.frequency_per_week;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.goal !== undefined) updateData.goal = data.goal;
      if (data.program_type !== undefined) updateData.program_type = data.program_type;
      if (data.duration_weeks !== undefined) updateData.duration_weeks = data.duration_weeks;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

      updateData.updated_at = new Date();

      return prisma.program_templates.update({
        where: { id: templateId },
        data: updateData,
        select: {
          id: true,
          name: true,
          description: true,
          difficulty_level: true,
          frequency_per_week: true,
          category: true,
          goal: true,
          program_type: true,
          duration_weeks: true,
          is_active: true,
          created_by_admin: true,
          created_at: true,
          updated_at: true,
        }
      });
    });
  },

  async deactivateTemplate(templateId: number): Promise<ProgramTemplateBasic | null> {
    return this.updateTemplate(templateId, { is_active: false });
  },

  async verifyTemplateExists(templateId: number): Promise<boolean> {
    const template = await prisma.program_templates.findUnique({
      where: { id: templateId },
      select: { id: true }
    });
    
    return template !== null;
  },

  async verifyTemplateActive(templateId: number): Promise<boolean> {
    const template = await prisma.program_templates.findUnique({
      where: { id: templateId },
      select: { is_active: true }
    });
    
    return template?.is_active === true;
  },
};