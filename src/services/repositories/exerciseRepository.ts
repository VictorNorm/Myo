import prisma from "../db";
import type { exercises } from "@prisma/client";

export const exerciseRepository = {
  findAll: async () => {
    return prisma.exercises.findMany({
      include: {
        muscle_groups: {
          include: {
            muscle_groups: true,
          },
        },
      },
    });
  },

  findById: async (id: number) => {
    return prisma.exercises.findUnique({
      where: { id },
      include: {
        muscle_groups: {
          include: {
            muscle_groups: true,
          },
        },
      },
    });
  },

  create: async (exerciseData: Omit<exercises, "id" | "createdAt">) => {
    return prisma.exercises.create({
      data: exerciseData,
    });
  },

  update: async (id: number, exerciseData: Partial<Omit<exercises, "id" | "createdAt">>) => {
    return prisma.exercises.update({
      where: { id },
      data: exerciseData,
    });
  },

  delete: async (id: number) => {
    return prisma.exercises.delete({
      where: { id },
    });
  },
  
  // Add more repository methods as needed
};