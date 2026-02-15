import { exerciseRepository } from "./repositories/exerciseRepository";
import type { exercises, Equipment, ExerciseCategory } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";
import prisma from "./db";

interface CreateExerciseInput {
	name: string;
	equipment: Equipment;
	category: ExerciseCategory;
	defaultIncrementKg?: number | string;
	minWeight?: number | string;
	maxWeight?: number | string;
	videoUrl?: string;
	muscleGroupIds?: number[];
}

interface UpdateExerciseInput {
	name?: string;
	equipment?: Equipment;
	category?: ExerciseCategory;
	defaultIncrementKg?: number | string;
	minWeight?: number | string;
	maxWeight?: number | string;
	videoUrl?: string | null;
	muscleGroupIds?: number[];
}

interface UpsertExerciseInput {
	id: number;
	sets: number;
	reps: number;
	weight: number;
}

interface SupersetInput {
	first_exercise_id: number;
	second_exercise_id: number;
}

interface MuscleGroupJoin {
	exercise_id: number;
	muscle_group_id: number;
	muscle_groups: {
		id: number;
		name: string;
	};
}

type ExerciseWithMuscleGroups = exercises & {
	muscle_groups?: MuscleGroupJoin[];
};

// Convert numeric input to Prisma Decimal or null
const toDecimal = (value: number | string | undefined): Decimal | null => {
	if (value === undefined || value === null) return null;
	return value as unknown as Decimal;
};

// Helper to format response data
const formatExerciseData = (
	exercise: exercises & { muscle_groups?: MuscleGroupJoin[] },
) => {
	return {
		...exercise,
		defaultIncrementKg: exercise.defaultIncrementKg
			? Number(exercise.defaultIncrementKg)
			: null,
		minWeight: exercise.minWeight ? Number(exercise.minWeight) : null,
		maxWeight: exercise.maxWeight ? Number(exercise.maxWeight) : null,
	};
};

export const exerciseService = {
	getAllExercises: async () => {
		const exercises = await exerciseRepository.findAll();
		return exercises.map(formatExerciseData);
	},

	getExerciseById: async (id: number) => {
		const exercise = await exerciseRepository.findById(id);
		if (!exercise) return null;
		return formatExerciseData(exercise);
	},

	createExercise: async (input: CreateExerciseInput) => {
		const exercise = await prisma.$transaction(async (tx) => {
			const created = await tx.exercises.create({
				data: {
					name: input.name,
					equipment: input.equipment,
					category: input.category,
					defaultIncrementKg: toDecimal(input.defaultIncrementKg),
					minWeight: toDecimal(input.minWeight),
					maxWeight: toDecimal(input.maxWeight),
					videoUrl: input.videoUrl || null,
				},
			});

			if (input.muscleGroupIds && input.muscleGroupIds.length > 0) {
				await Promise.all(
					input.muscleGroupIds.map((muscleGroupId) =>
						tx.exercise_muscle_groups.create({
							data: {
								exercise_id: created.id,
								muscle_group_id: muscleGroupId,
								role: 'PRIMARY',
							},
						})
					)
				);
			}

			return tx.exercises.findUnique({
				where: { id: created.id },
				include: {
					muscle_groups: {
						include: {
							muscle_groups: true,
						},
					},
				},
			});
		});

		if (!exercise) {
			throw new Error('Failed to create exercise');
		}

		return formatExerciseData(exercise);
	},

	updateExercise: async (id: number, input: UpdateExerciseInput) => {
		const exercise = await prisma.$transaction(async (tx) => {
			// 1. Build update data for the exercises table
			const updateData: Partial<Omit<exercises, "id" | "createdAt">> = {};

			if (input.name !== undefined) updateData.name = input.name;
			if (input.equipment !== undefined) updateData.equipment = input.equipment;
			if (input.category !== undefined) updateData.category = input.category;
			if (input.videoUrl !== undefined) updateData.videoUrl = input.videoUrl || null;
			if (input.defaultIncrementKg !== undefined)
				updateData.defaultIncrementKg = toDecimal(input.defaultIncrementKg);
			if (input.minWeight !== undefined)
				updateData.minWeight = toDecimal(input.minWeight);
			if (input.maxWeight !== undefined)
				updateData.maxWeight = toDecimal(input.maxWeight);

			// 2. Update the exercise record
			await tx.exercises.update({
				where: { id },
				data: updateData,
			});

			// 3. Update muscle group associations if provided
			if (input.muscleGroupIds !== undefined) {
				// Delete existing associations
				await tx.exercise_muscle_groups.deleteMany({
					where: { exercise_id: id },
				});

				// Create new associations
				if (input.muscleGroupIds.length > 0) {
					await Promise.all(
						input.muscleGroupIds.map((muscleGroupId) =>
							tx.exercise_muscle_groups.create({
								data: {
									exercise_id: id,
									muscle_group_id: muscleGroupId,
									role: 'PRIMARY',
								},
							})
						)
					);
				}
			}

			// 4. Return the full exercise with muscle groups
			return tx.exercises.findUnique({
				where: { id },
				include: {
					muscle_groups: {
						include: {
							muscle_groups: true,
						},
					},
				},
			});
		});

		if (!exercise) {
			throw new Error('Exercise not found');
		}

		return formatExerciseData(exercise);
	},

	deleteExercise: async (id: number) => {
		return exerciseRepository.delete(id);
	},

	getExercisesByProgramId: async (programId: number) => {
		try {
			const exercises = await exerciseRepository.getExercisesByProgramId(programId);
			
			// Transform to consistent format
			return exercises.map(exercise => ({
				id: exercise.id,
				name: exercise.name,
				equipment: exercise.equipment,
				category: exercise.category,
				defaultIncrementKg: exercise.defaultIncrementKg ? Number(exercise.defaultIncrementKg) : null,
				minWeight: exercise.minWeight ? Number(exercise.minWeight) : null,
				maxWeight: exercise.maxWeight ? Number(exercise.maxWeight) : null,
				videoUrl: exercise.videoUrl,
				createdAt: exercise.createdAt,
				muscleGroups: exercise.muscle_groups.map(emg => ({
					id: emg.muscle_groups.id,
					name: emg.muscle_groups.name
				}))
			}));
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to fetch program exercises: ${errorMessage}`);
		}
	},

	upsertExercisesToWorkout: async (
		workoutId: number,
		exercises: UpsertExerciseInput[],
		supersets?: SupersetInput[]
	) => {
		return exerciseRepository.upsertExercisesToWorkout(
			workoutId,
			exercises,
			supersets
		);
	},
};
