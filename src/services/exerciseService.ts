import { exerciseRepository } from "./repositories/exerciseRepository";
import type { exercises, Equipment, ExerciseCategory } from "@prisma/client";
import type { Decimal } from "@prisma/client/runtime/library";

interface CreateExerciseInput {
	name: string;
	equipment: Equipment;
	category: ExerciseCategory;
	defaultIncrementKg?: number | string;
	minWeight?: number | string;
	maxWeight?: number | string;
	notes?: string | null;
}

interface UpdateExerciseInput {
	name?: string;
	equipment?: Equipment;
	category?: ExerciseCategory;
	defaultIncrementKg?: number | string;
	minWeight?: number | string;
	maxWeight?: number | string;
	notes?: string | null;
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
		// Handle notes properly - convert undefined to null to match expected type
		const notes: string | null = input.notes === undefined ? null : input.notes;

		const exercise = await exerciseRepository.create({
			name: input.name,
			equipment: input.equipment,
			category: input.category,
			defaultIncrementKg: toDecimal(input.defaultIncrementKg),
			minWeight: toDecimal(input.minWeight),
			maxWeight: toDecimal(input.maxWeight),
			notes: notes,
			videoUrl: null
		});
		return formatExerciseData(exercise);
	},

	updateExercise: async (id: number, input: UpdateExerciseInput) => {
		const updateData: Partial<Omit<exercises, "id" | "createdAt">> = {};

		if (input.name !== undefined) updateData.name = input.name;
		if (input.equipment !== undefined) updateData.equipment = input.equipment;
		if (input.category !== undefined) updateData.category = input.category;
		if (input.defaultIncrementKg !== undefined)
			updateData.defaultIncrementKg = toDecimal(input.defaultIncrementKg);
		if (input.minWeight !== undefined)
			updateData.minWeight = toDecimal(input.minWeight);
		if (input.maxWeight !== undefined)
			updateData.maxWeight = toDecimal(input.maxWeight);
		if (input.notes !== undefined) updateData.notes = input.notes;

		const exercise = await exerciseRepository.update(id, updateData);
		return formatExerciseData(exercise);
	},

	deleteExercise: async (id: number) => {
		return exerciseRepository.delete(id);
	},
};
