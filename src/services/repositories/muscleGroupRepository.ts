import prisma from "../db";

export const muscleGroupRepository = {
	findAll: async () => {
		return await prisma.muscle_groups.findMany({
			orderBy: {
				id: 'asc'
			}
		});
	},

	findById: async (id: number) => {
		return await prisma.muscle_groups.findUnique({
			where: { id }
		});
	},

	create: async (data: { name: string }) => {
		return await prisma.muscle_groups.create({
			data
		});
	},

	update: async (id: number, data: { name?: string }) => {
		return await prisma.muscle_groups.update({
			where: { id },
			data
		});
	},

	delete: async (id: number) => {
		return await prisma.muscle_groups.delete({
			where: { id }
		});
	}
};