import { PrismaClient } from '@prisma/client';
import { ExerciseWeight } from '../../types/beginnerProgram';

const prisma = new PrismaClient();

// Updated with EXACT production exercise names
const baseWeights: Record<string, { male: number; female: number }> = {
  'Barbell high bar squat': { male: 40, female: 25 },
  'Lat pulldown, neutral': { male: 40, female: 20 },
  'Trap bar deadlift': { male: 50, female: 30 },
  'Dumbbell bench press': { male: 12, female: 8 },
  'Single arm dumbbell row': { male: 16, female: 8 },
  'Leg press': { male: 80, female: 50 },
  'Incline pushup': { male: 0, female: 0 }, // bodyweight
  'Leg extension': { male: 40, female: 20 },
  'Cable tricep pushdown, bar': { male: 20, female: 10 },
  'Machine hamstring curl': { male: 30, female: 20 },
  'Dumbbell lateral raise': { male: 6, female: 3 }
};

function getAgeMultiplier(age: number): number {
  if (age <= 40) return 1.0;
  if (age <= 50) return 0.9;
  return 0.8;
}

function roundToIncrement(weight: number, increment: number): number {
  return Math.round(weight / increment) * increment;
}

function roundDumbbellWeight(weight: number, increment: number): number {
  if (weight <= 10) {
    return Math.round(weight); // Always use 1kg increments for 0-10kg
  }
  return roundToIncrement(weight, increment);
}

export async function calculateStartingWeights(
  userId: number,
  exerciseList: Array<{ exerciseId: number; exerciseName: string }>,
  age: number,
  gender: 'male' | 'female'
): Promise<ExerciseWeight[]> {
  try {
    // Get user's equipment increment settings
    const userSettings = await prisma.user_settings.findUnique({
      where: { user_id: userId },
      select: {
        barbellIncrement: true,
        dumbbellIncrement: true,
        cableIncrement: true,
        machineIncrement: true,
      }
    });

    if (!userSettings) {
      throw new Error('User settings not found');
    }

    const ageMultiplier = getAgeMultiplier(age);
    const exerciseWeights: ExerciseWeight[] = [];

    for (const exercise of exerciseList) {
      const baseWeight = baseWeights[exercise.exerciseName];
      
      if (!baseWeight) {
        console.warn(`No base weight found for exercise: ${exercise.exerciseName}`);
        // Default to 0 for unknown exercises (bodyweight)
        exerciseWeights.push({
          exerciseId: exercise.exerciseId,
          weight: 0
        });
        continue;
      }

      // Calculate starting weight
      const startingWeight = baseWeight[gender] * ageMultiplier;
      
      // Determine appropriate increment based on exercise equipment
      let roundedWeight: number;
      const exerciseName = exercise.exerciseName.toLowerCase();
      
      if (exerciseName.includes('barbell') || exerciseName.includes('trap bar')) {
        roundedWeight = roundToIncrement(startingWeight, Number(userSettings.barbellIncrement));
      } else if (exerciseName.includes('dumbbell')) {
        roundedWeight = roundDumbbellWeight(startingWeight, Number(userSettings.dumbbellIncrement));
      } else if (exerciseName.includes('cable')) {
        roundedWeight = roundToIncrement(startingWeight, Number(userSettings.cableIncrement));
      } else if (exerciseName.includes('machine') || exerciseName.includes('leg press') || exerciseName.includes('leg extension') || exerciseName.includes('hamstring curl')) {
        roundedWeight = roundToIncrement(startingWeight, Number(userSettings.machineIncrement));
      } else {
        // Default to barbell increment for other exercises
        roundedWeight = roundToIncrement(startingWeight, Number(userSettings.barbellIncrement));
      }

      exerciseWeights.push({
        exerciseId: exercise.exerciseId,
        weight: Math.max(0, roundedWeight) // Ensure weight is never negative
      });
    }

    return exerciseWeights;
  } catch (error) {
    console.error('Error calculating starting weights:', error);
    throw error;
  }
}