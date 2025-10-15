import { PrismaClient } from '@prisma/client';
import { ExerciseWeight } from '../../types/beginnerProgram';

const prisma = new PrismaClient();

const baseWeights: Record<string, { male: number; female: number }> = {
  'Barbell High Bar Squat': { male: 40, female: 25 },
  'Lat Pulldown (neutral grip)': { male: 40, female: 20 },
  'Trap Bar Deadlift': { male: 50, female: 30 },
  'Dumbbell Bench Press': { male: 12, female: 8 },
  'Single Arm Dumbbell Row': { male: 16, female: 8 },
  'Leg Press': { male: 80, female: 50 },
  'Incline Push-up': { male: 0, female: 0 }, // bodyweight
  'Leg Extension': { male: 40, female: 20 },
  'Cable Tricep Pushdown': { male: 20, female: 10 },
  'Machine Hamstring Curl': { male: 30, female: 20 },
  'Dumbbell Lateral Raise': { male: 6, female: 3 }
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