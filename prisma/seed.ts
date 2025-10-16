import { PrismaClient, Equipment, ExerciseCategory } from "@prisma/client";
const prisma = new PrismaClient();

async function seedExercises() {
  console.log('Seeding exercises...');
  
  // Check if exercises already exist
  const existingExercises = await prisma.exercises.count();
  if (existingExercises > 0) {
    console.log(`Exercises already exist (${existingExercises} found), skipping exercise seeding`);
    return;
  }

  // Production exercises - exact data from your database
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
  
  // Delete existing templates to avoid duplicates
  await prisma.template_exercises.deleteMany();
  await prisma.template_workouts.deleteMany();
  await prisma.program_templates.deleteMany();

  // Get exercise IDs for referencing - using EXACT names from production
  const exercises = await prisma.exercises.findMany({
    select: { id: true, name: true }
  });
  
  const exerciseMap = exercises.reduce((acc, ex) => {
    acc[ex.name] = ex.id;
    return acc;
  }, {} as Record<string, number>);

  // Verify we have all needed exercises
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

  // Create Beginner Full Body - 4 Exercises template
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
                { exercise_id: exerciseMap['Barbell high bar squat'], sets: 3, reps: 8, weight: null, order: 1 },
                { exercise_id: exerciseMap['Single arm dumbbell row'], sets: 3, reps: 8, weight: null, order: 2 },
                { exercise_id: exerciseMap['Leg press'], sets: 3, reps: 8, weight: null, order: 3 },
                { exercise_id: exerciseMap['Incline pushup'], sets: 3, reps: 8, weight: null, order: 4 },
              ]
            }
          }
        ]
      }
    }
  });

  // Create Beginner Full Body - 6 Exercises template
  const beginnerTemplate6 = await prisma.program_templates.create({
    data: {
      name: 'Beginner Full Body - 6 Exercises',
      description: 'Comprehensive beginner program with more exercises per workout, 40-50 minutes.',
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
  console.log('Created templates:', [
    beginnerTemplate4.name,
    beginnerTemplate6.name
  ].join(', '));
}

async function main() {
  await seedExercises();
  await seedProgramTemplates();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });