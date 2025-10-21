import { PrismaClient, Equipment, ExerciseCategory, ProgramStatus, ExperienceLevel, Goal, ProgramType } from "@prisma/client";
import bcrypt from "bcrypt";
import { subWeeks, subDays, addDays } from "date-fns";

const prisma = new PrismaClient();

// Test data configuration
const TEST_USER_EMAIL = "testuser@myo.app";
const TEST_USER_PASSWORD = "Test123!";
const WEEKS_OF_DATA = 8; // How many weeks of workout history to generate

async function seedExercises() {
  console.log('Seeding exercises...');
  
  const existingExercises = await prisma.exercises.count();
  if (existingExercises > 0) {
    console.log(`Exercises already exist (${existingExercises} found), skipping exercise seeding`);
    return;
  }

  const exercises = [
    { name: 'Ab rollout', equipment: Equipment.BODYWEIGHT, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Back extension', equipment: Equipment.MACHINE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Barbell bench press', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Barbell bent over row', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Barbell bicep curl', equipment: Equipment.BARBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Barbell deadlift', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Barbell forearm curls', equipment: Equipment.BARBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Barbell high bar squat', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Barbell hip thrust', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Barbell incline bench press', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Barbell low bar squat', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Barbell shrugs', equipment: Equipment.BARBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Backward lunge', equipment: Equipment.DUMBBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Bent over dumbbell rear delt fly', equipment: Equipment.DUMBBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Cable bicep curl, straight bar', equipment: Equipment.CABLE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Cable fly', equipment: Equipment.CABLE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Cable overhead tricep press, bar', equipment: Equipment.CABLE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Cable overhead tricep press, rope attachment', equipment: Equipment.CABLE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Cable rear delt fly', equipment: Equipment.CABLE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Cable rear delt fly, high angle', equipment: Equipment.CABLE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Cable tricep pushdown, bar', equipment: Equipment.CABLE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Chest supported dumbbell high row', equipment: Equipment.DUMBBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Chest supported dumbbell rear delt fly', equipment: Equipment.DUMBBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Chest supported dumbbell reverse fly', equipment: Equipment.DUMBBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Chin-up', equipment: Equipment.BODYWEIGHT, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Chin-up, machine assisted', equipment: Equipment.MACHINE, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Chin-up, neutral', equipment: Equipment.BODYWEIGHT, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Close grip bench press', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Deficit pushup', equipment: Equipment.BODYWEIGHT, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Dips', equipment: Equipment.BODYWEIGHT, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Dual cable bicep curl', equipment: Equipment.CABLE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Dumbbell bench press', equipment: Equipment.DUMBBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Dumbbell bicep curl', equipment: Equipment.DUMBBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Dumbbell chest fly', equipment: Equipment.DUMBBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Dumbbell forward lunge', equipment: Equipment.DUMBBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Dumbbell lateral raise', equipment: Equipment.DUMBBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Dumbbell shrugs', equipment: Equipment.DUMBBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Dumbbell skull crusher', equipment: Equipment.DUMBBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Dumbbell standing calf raise', equipment: Equipment.DUMBBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'EZ bar bicep curl', equipment: Equipment.BARBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'EZ bar overhead tricep press', equipment: Equipment.BARBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'EZ bar skull crusher', equipment: Equipment.BARBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Front squat', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Incline dumbbell bench press', equipment: Equipment.DUMBBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Incline dumbbell bicep curl', equipment: Equipment.DUMBBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Incline dumbbell hammer curl', equipment: Equipment.DUMBBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Incline pushup', equipment: Equipment.BODYWEIGHT, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Jefferson curl', equipment: Equipment.DUMBBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Lat pulldown, neutral', equipment: Equipment.CABLE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Lat pulldown neutral wide', equipment: Equipment.CABLE, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Lat pulldown, pronated', equipment: Equipment.CABLE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Lat pulldown, supinated', equipment: Equipment.CABLE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Lean in dumbbell lateral raise', equipment: Equipment.DUMBBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Leg extension', equipment: Equipment.MACHINE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Leg press', equipment: Equipment.MACHINE, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Leg press calf raise', equipment: Equipment.MACHINE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Machine hamstring curl', equipment: Equipment.MACHINE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Nordic hamstring', equipment: Equipment.BODYWEIGHT, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Pullup', equipment: Equipment.BODYWEIGHT, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Pullup, machine assisted', equipment: Equipment.MACHINE, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Pushup', equipment: Equipment.BODYWEIGHT, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Reverse deficit lunge', equipment: Equipment.DUMBBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Romanian deadlift', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Seated dumbbell overhead press', equipment: Equipment.DUMBBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Seated dumbbell lateral raise', equipment: Equipment.DUMBBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Single arm dumbbell row', equipment: Equipment.DUMBBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Single arm cable lateral raise', equipment: Equipment.CABLE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Single cable bicep curl', equipment: Equipment.CABLE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Smith machine calf raise', equipment: Equipment.MACHINE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: null },
    { name: 'Smith machine squat', equipment: Equipment.MACHINE, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Step up', equipment: Equipment.DUMBBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'T bar row', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
    { name: 'Trap bar deadlift', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: null },
  ];

  await prisma.exercises.createMany({
    data: exercises,
    skipDuplicates: true,
  });

  console.log(`Seeded ${exercises.length} exercises`);
}

async function seedProgramTemplates() {
  console.log('Seeding program templates...');
  
  await prisma.template_exercises.deleteMany();
  await prisma.template_workouts.deleteMany();
  await prisma.program_templates.deleteMany();

  const exercises = await prisma.exercises.findMany({
    select: { id: true, name: true }
  });
  
  const exerciseMap = exercises.reduce((acc, ex) => {
    acc[ex.name] = ex.id;
    return acc;
  }, {} as Record<string, number>);

  const requiredExercises = [
    'Barbell high bar squat',
    'Lat pulldown, neutral',
    'Trap bar deadlift',
    'Dumbbell bench press',
    'Single arm dumbbell row',
    'Leg press',
    'Incline pushup',
    'Leg extension',
    'Cable tricep pushdown, bar',
    'Machine hamstring curl',
    'Dumbbell lateral raise'
  ];

  const missingExercises = requiredExercises.filter(name => !exerciseMap[name]);
  if (missingExercises.length > 0) {
    console.error('Missing required exercises:', missingExercises);
    throw new Error(`Cannot create templates - missing exercises: ${missingExercises.join(', ')}`);
  }

  const beginnerTemplate4 = await prisma.program_templates.create({
    data: {
      name: 'Beginner Full Body - 4 Exercises',
      description: 'Perfect for beginners with limited time. 4 effective exercises per workout, 25-35 minutes.',
      difficulty_level: 'BEGINNER',
      frequency_per_week: 2,
      category: 'GENERAL',
      goal: 'HYPERTROPHY',
      program_type: 'AUTOMATED',
      is_active: true,
      template_workouts: {
        create: [
          {
            name: 'Day 1',
            order: 1,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Barbell high bar squat'], sets: 3, reps: 8, weight: null, order: 1 },
                { exercise_id: exerciseMap['Lat pulldown, neutral'], sets: 3, reps: 8, weight: null, order: 2 },
                { exercise_id: exerciseMap['Trap bar deadlift'], sets: 3, reps: 8, weight: null, order: 3 },
                { exercise_id: exerciseMap['Dumbbell bench press'], sets: 3, reps: 8, weight: null, order: 4 },
              ]
            }
          },
          {
            name: 'Day 2',
            order: 2,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Leg press'], sets: 3, reps: 8, weight: null, order: 1 },
                { exercise_id: exerciseMap['Single arm dumbbell row'], sets: 3, reps: 8, weight: null, order: 2 },
                { exercise_id: exerciseMap['Incline pushup'], sets: 3, reps: 8, weight: null, order: 3 },
                { exercise_id: exerciseMap['Dumbbell lateral raise'], sets: 3, reps: 8, weight: null, order: 4 },
              ]
            }
          }
        ]
      }
    }
  });

  const beginnerTemplate6 = await prisma.program_templates.create({
    data: {
      name: 'Beginner Full Body - 6 Exercises',
      description: 'Comprehensive beginner program. 6 exercises per workout, 40-50 minutes.',
      difficulty_level: 'BEGINNER',
      frequency_per_week: 2,
      category: 'GENERAL',
      goal: 'HYPERTROPHY',
      program_type: 'AUTOMATED',
      is_active: true,
      template_workouts: {
        create: [
          {
            name: 'Day 1',
            order: 1,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Barbell high bar squat'], sets: 3, reps: 8, weight: null, order: 1 },
                { exercise_id: exerciseMap['Lat pulldown, neutral'], sets: 3, reps: 8, weight: null, order: 2 },
                { exercise_id: exerciseMap['Trap bar deadlift'], sets: 3, reps: 8, weight: null, order: 3 },
                { exercise_id: exerciseMap['Dumbbell bench press'], sets: 3, reps: 8, weight: null, order: 4 },
                { exercise_id: exerciseMap['Leg extension'], sets: 3, reps: 8, weight: null, order: 5 },
                { exercise_id: exerciseMap['Cable tricep pushdown, bar'], sets: 3, reps: 8, weight: null, order: 6 },
              ]
            }
          },
          {
            name: 'Day 2',
            order: 2,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Barbell high bar squat'], sets: 3, reps: 8, weight: null, order: 1 },
                { exercise_id: exerciseMap['Single arm dumbbell row'], sets: 3, reps: 8, weight: null, order: 2 },
                { exercise_id: exerciseMap['Leg press'], sets: 3, reps: 8, weight: null, order: 3 },
                { exercise_id: exerciseMap['Incline pushup'], sets: 3, reps: 8, weight: null, order: 4 },
                { exercise_id: exerciseMap['Machine hamstring curl'], sets: 3, reps: 8, weight: null, order: 5 },
                { exercise_id: exerciseMap['Dumbbell lateral raise'], sets: 3, reps: 8, weight: null, order: 6 },
              ]
            }
          }
        ]
      }
    }
  });

  console.log('Beginner program templates seeded successfully');
}

async function seedTestUserAndWorkouts() {
  console.log('Seeding test user and workout data...');

  let testUser = await prisma.users.findUnique({
    where: { username: TEST_USER_EMAIL }
  });

  if (!testUser) {
    const hashedPassword = await bcrypt.hash(TEST_USER_PASSWORD, 10);
    testUser = await prisma.users.create({
      data: {
        username: TEST_USER_EMAIL,
        password_hash: hashedPassword,
        firstname: 'Test',
        lastname: 'User',
        role: 'USER',
        emailVerified: true,
      }
    });
    console.log(`Created test user: ${TEST_USER_EMAIL}`);
  } else {
    console.log(`Test user already exists: ${TEST_USER_EMAIL}`);
  }

  await seedActiveProgram(testUser);
  await seedInactiveProgram(testUser);

  console.log(`Test user credentials:`);
  console.log(`  Email: ${TEST_USER_EMAIL}`);
  console.log(`  Password: ${TEST_USER_PASSWORD}`);
}

async function seedActiveProgram(testUser: any) {
  console.log('Seeding active program...');

  const exercises = await prisma.exercises.findMany({
    select: { id: true, name: true }
  });
  
  const exerciseMap = exercises.reduce((acc, ex) => {
    acc[ex.name] = ex.id;
    return acc;
  }, {} as Record<string, number>);

  const workoutExercises = [
    { name: 'Barbell high bar squat', startWeight: 60, increment: 2.5 },
    { name: 'Barbell bench press', startWeight: 50, increment: 2.5 },
    { name: 'Barbell deadlift', startWeight: 80, increment: 5 },
    { name: 'Lat pulldown, neutral', startWeight: 45, increment: 2.5 },
    { name: 'Dumbbell bench press', startWeight: 20, increment: 2 },
    { name: 'Single arm dumbbell row', startWeight: 15, increment: 2 },
    { name: 'Leg extension', startWeight: 40, increment: 2.5 },
    { name: 'Machine hamstring curl', startWeight: 35, increment: 2.5 },
  ];

  const program = await prisma.programs.create({
    data: {
      name: 'Test Progressive Program',
      userId: testUser.id,
      status: ProgramStatus.ACTIVE,
      goal: Goal.HYPERTROPHY,
      programType: ProgramType.AUTOMATED,
      startDate: subWeeks(new Date(), WEEKS_OF_DATA),
      totalWorkouts: 2, // 2 workouts in the program (A and B)
    }
  });

  const workoutA = await prisma.workouts.create({
    data: { name: 'Workout A', program_id: program.id }
  });

  const workoutB = await prisma.workouts.create({
    data: { name: 'Workout B', program_id: program.id }
  });

  const workoutAExercises = [
    'Barbell high bar squat',
    'Barbell bench press',
    'Lat pulldown, neutral',
    'Leg extension',
  ];

  for (let i = 0; i < workoutAExercises.length; i++) {
    await prisma.workout_exercises.create({
      data: {
        workout_id: workoutA.id,
        exercise_id: exerciseMap[workoutAExercises[i]],
        sets: 3,
        reps: 8,
        weight: null,
        order: i + 1,
      }
    });
  }

  const workoutBExercises = [
    'Barbell deadlift',
    'Dumbbell bench press',
    'Single arm dumbbell row',
    'Machine hamstring curl',
  ];

  for (let i = 0; i < workoutBExercises.length; i++) {
    await prisma.workout_exercises.create({
      data: {
        workout_id: workoutB.id,
        exercise_id: exerciseMap[workoutBExercises[i]],
        sets: 3,
        reps: 8,
        weight: null,
        order: i + 1,
      }
    });
  }

  const startDate = subWeeks(new Date(), WEEKS_OF_DATA);
  let currentDate = startDate;
  let workoutCount = 0;
  const workoutsPerWeek = 3;

  const exerciseWeights = new Map<string, number>();
  workoutExercises.forEach(ex => {
    exerciseWeights.set(ex.name, ex.startWeight);
  });

  while (currentDate <= new Date()) {
    const isWorkoutA = workoutCount % 2 === 0;
    const workout = isWorkoutA ? workoutA : workoutB;
    const exerciseList = isWorkoutA ? workoutAExercises : workoutBExercises;

    await prisma.workout_completions.create({
      data: {
        user_id: testUser.id,
        program_id: program.id,
        workout_id: workout.id,
        completed_at: currentDate,
        duration_minutes: 45 + Math.floor(Math.random() * 15),
      }
    });

    for (const exerciseName of exerciseList) {
      const exerciseConfig = workoutExercises.find(e => e.name === exerciseName);
      if (!exerciseConfig) continue;

      const currentWeight = exerciseWeights.get(exerciseName) || exerciseConfig.startWeight;
      const exerciseId = exerciseMap[exerciseName];

      await prisma.completed_exercises.create({
        data: {
          user_id: testUser.id,
          workout_id: workout.id,
          exercise_id: exerciseId,
          sets: 3,
          reps: 8,
          weight: currentWeight,
          completedAt: currentDate,
          rating: Math.floor(Math.random() * 3) + 3,
        }
      });

      if (workoutCount > 0 && workoutCount % 2 === 0) {
        const oldWeight = currentWeight;
        const newWeight = currentWeight + exerciseConfig.increment;
        
        await prisma.progression_history.create({
          data: {
            user_id: testUser.id,
            program_id: program.id,
            exercise_id: exerciseId,
            oldWeight: oldWeight,
            newWeight: newWeight,
            oldReps: 8,
            newReps: 8,
            reason: 'Weekly progression',
            createdAt: currentDate,
          }
        });

        exerciseWeights.set(exerciseName, newWeight);
      }
    }

    workoutCount++;
    const daysUntilNext = Math.floor(Math.random() * 2) + 2;
    currentDate = addDays(currentDate, daysUntilNext);
    
    if (workoutCount % workoutsPerWeek === 0) {
      currentDate = addDays(currentDate, 2);
    }
  }

  console.log(`✓ Active program: Created ${workoutCount} workout sessions with progressive overload`);
}

async function seedInactiveProgram(testUser: any) {
  console.log('Seeding inactive program...');

  const exercises = await prisma.exercises.findMany({
    select: { id: true, name: true }
  });
  
  const exerciseMap = exercises.reduce((acc, ex) => {
    acc[ex.name] = ex.id;
    return acc;
  }, {} as Record<string, number>);

  const programExercises = [
    { name: 'Barbell incline bench press', startWeight: 45, increment: 2.5 },
    { name: 'Pullup', startWeight: 0, increment: 0 },
    { name: 'Barbell hip thrust', startWeight: 70, increment: 5 },
    { name: 'Dumbbell lateral raise', startWeight: 8, increment: 1 },
    { name: 'Romanian deadlift', startWeight: 60, increment: 5 },
    { name: 'Cable fly', startWeight: 20, increment: 2.5 },
    { name: 'Leg press', startWeight: 100, increment: 10 },
    { name: 'Cable tricep pushdown, bar', startWeight: 30, increment: 2.5 },
    { name: 'Front squat', startWeight: 50, increment: 2.5 },
    { name: 'T bar row', startWeight: 40, increment: 2.5 },
    { name: 'Dumbbell chest fly', startWeight: 12, increment: 2 },
    { name: 'EZ bar bicep curl', startWeight: 25, increment: 2.5 },
    { name: 'Barbell bent over row', startWeight: 55, increment: 2.5 },
    { name: 'Seated dumbbell overhead press', startWeight: 15, increment: 2 },
    { name: 'Leg press calf raise', startWeight: 80, increment: 10 },
    { name: 'Cable rear delt fly', startWeight: 15, increment: 2.5 },
  ];

  const programDurationWeeks = 12;
  const programEndDate = subWeeks(new Date(), 12);
  const programStartDate = subWeeks(programEndDate, programDurationWeeks);

  const inactiveProgram = await prisma.programs.create({
    data: {
      name: 'Completed Upper/Lower Split',
      userId: testUser.id,
      status: ProgramStatus.COMPLETED,
      goal: Goal.HYPERTROPHY,
      programType: ProgramType.AUTOMATED,
      startDate: programStartDate,
      endDate: programEndDate,
    }
  });

  const workout1 = await prisma.workouts.create({
    data: { name: 'Upper A', program_id: inactiveProgram.id }
  });
  
  const workout2 = await prisma.workouts.create({
    data: { name: 'Lower A', program_id: inactiveProgram.id }
  });
  
  const workout3 = await prisma.workouts.create({
    data: { name: 'Upper B', program_id: inactiveProgram.id }
  });
  
  const workout4 = await prisma.workouts.create({
    data: { name: 'Lower B', program_id: inactiveProgram.id }
  });

  const workouts = [workout1, workout2, workout3, workout4];

  for (let workoutIndex = 0; workoutIndex < 4; workoutIndex++) {
    const workout = workouts[workoutIndex];
    const exerciseSlice = programExercises.slice(workoutIndex * 4, (workoutIndex + 1) * 4);
    
    for (let i = 0; i < exerciseSlice.length; i++) {
      await prisma.workout_exercises.create({
        data: {
          workout_id: workout.id,
          exercise_id: exerciseMap[exerciseSlice[i].name],
          sets: 3,
          reps: 8,
          weight: null,
          order: i + 1,
        }
      });
    }
  }

  let currentDate = programStartDate;
  const totalWeeks = programDurationWeeks;
  const halfwayWeek = Math.floor(totalWeeks / 2);
  let workoutCount = 0;
  let weekNumber = 0;

  const exerciseWeights = new Map<string, number>();
  programExercises.forEach(ex => {
    exerciseWeights.set(ex.name, ex.startWeight);
  });

  const exerciseRatings = new Map<string, number[]>();
  programExercises.forEach(ex => {
    exerciseRatings.set(ex.name, []);
  });

  while (currentDate <= programEndDate) {
    weekNumber = Math.floor(
      (currentDate.getTime() - programStartDate.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    
    const isSecondHalf = weekNumber >= halfwayWeek;
    const workoutsThisWeek = isSecondHalf ? [0, 1, 2, 3] : [0, 1, 2];

    for (const workoutIndex of workoutsThisWeek) {
      const workout = workouts[workoutIndex];
      const exerciseSlice = programExercises.slice(workoutIndex * 4, (workoutIndex + 1) * 4);

      await prisma.workout_completions.create({
        data: {
          user_id: testUser.id,
          program_id: inactiveProgram.id,
          workout_id: workout.id,
          completed_at: currentDate,
          duration_minutes: 50 + Math.floor(Math.random() * 10),
        }
      });

      for (const exerciseConfig of exerciseSlice) {
        const currentWeight = exerciseWeights.get(exerciseConfig.name) || exerciseConfig.startWeight;
        const exerciseId = exerciseMap[exerciseConfig.name];
        const ratings = exerciseRatings.get(exerciseConfig.name) || [];

        const ratingIndex = ratings.length % 3;
        const rating = ratingIndex === 2 ? 3 : 4;

        await prisma.completed_exercises.create({
          data: {
            user_id: testUser.id,
            workout_id: workout.id,
            exercise_id: exerciseId,
            sets: 3,
            reps: 8,
            weight: currentWeight,
            completedAt: currentDate,
            rating: rating,
          }
        });

        ratings.push(rating);
        exerciseRatings.set(exerciseConfig.name, ratings);

        if (ratings.length % 3 === 0 && ratings.length > 0) {
          const oldWeight = currentWeight;
          const newWeight = currentWeight + exerciseConfig.increment;
          
          if (exerciseConfig.increment > 0) {
            await prisma.progression_history.create({
              data: {
                user_id: testUser.id,
                program_id: inactiveProgram.id,
                exercise_id: exerciseId,
                oldWeight: oldWeight,
                newWeight: newWeight,
                oldReps: 8,
                newReps: 8,
                reason: 'Three-week progression cycle',
                createdAt: currentDate,
              }
            });
          }

          exerciseWeights.set(exerciseConfig.name, newWeight);
        }
      }

      workoutCount++;
      currentDate = addDays(currentDate, 2);
    }

    const daysIntoWeek = (currentDate.getTime() - programStartDate.getTime()) / (24 * 60 * 60 * 1000);
    const nextWeekStart = addDays(programStartDate, Math.ceil(daysIntoWeek / 7) * 7);
    currentDate = nextWeekStart;
  }

  console.log(`✓ Inactive program: Created ${workoutCount} workout sessions over ${totalWeeks} weeks`);
  console.log(`  - First ${halfwayWeek} weeks: 3/4 workouts per week`);
  console.log(`  - Last ${totalWeeks - halfwayWeek} weeks: 4/4 workouts per week`);
  console.log(`  - Progression: Rating pattern 4-4-3, weight increase every 3 workouts`);
}

async function main() {
  console.log('Cleaning up existing test data...');
  
  const existingUser = await prisma.users.findUnique({
    where: { username: TEST_USER_EMAIL }
  });

  if (existingUser) {
    await prisma.completed_exercises.deleteMany({
      where: { user_id: existingUser.id }
    });
    await prisma.progression_history.deleteMany({
      where: { user_id: existingUser.id }
    });
    await prisma.workout_completions.deleteMany({
      where: { user_id: existingUser.id }
    });
    await prisma.workout_progress.deleteMany({
      where: { user_id: existingUser.id }
    });
    
    const existingPrograms = await prisma.programs.findMany({
      where: { userId: existingUser.id }
    });
    
    for (const program of existingPrograms) {
      await prisma.workout_exercises.deleteMany({
        where: { workouts: { program_id: program.id } }
      });
      await prisma.workouts.deleteMany({
        where: { program_id: program.id }
      });
    }
    
    await prisma.programs.deleteMany({
      where: { userId: existingUser.id }
    });
    
    console.log('✓ Cleaned up existing test data');
  }

  await seedExercises();
  await seedProgramTemplates();
  await seedTestUserAndWorkouts();
}

main()
  .then(async () => {
    console.log('\n✅ Seeding completed successfully!');
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });