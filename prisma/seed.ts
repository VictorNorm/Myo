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

  const exercises = [
    { name: 'Squat', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 2.5 },
    { name: 'Bench Press', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 2.5 },
    { name: 'Deadlift', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 2.5 },
    { name: 'Overhead Press', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 2.5 },
    { name: 'Barbell Row', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 2.5 },
    { name: 'Pull-up', equipment: Equipment.BODYWEIGHT, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 2.5 },
    { name: 'Dip', equipment: Equipment.BODYWEIGHT, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 2.5 },
    { name: 'Push-up', equipment: Equipment.BODYWEIGHT, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 0 },
    { name: 'Incline Dumbbell Press', equipment: Equipment.DUMBBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 2.0 },
    { name: 'Dumbbell Row', equipment: Equipment.DUMBBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 2.0 },
    { name: 'Romanian Deadlift', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 2.5 },
    { name: 'Bulgarian Split Squat', equipment: Equipment.DUMBBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 2.0 },
    
    // Beginner program specific exercises
    { name: 'Barbell High Bar Squat', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 2.5 },
    { name: 'Lat Pulldown (neutral grip)', equipment: Equipment.CABLE, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 2.5 },
    { name: 'Trap Bar Deadlift', equipment: Equipment.BARBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 2.5 },
    { name: 'Dumbbell Bench Press', equipment: Equipment.DUMBBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 2.0 },
    { name: 'Single Arm Dumbbell Row', equipment: Equipment.DUMBBELL, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 2.0 },
    { name: 'Leg Press', equipment: Equipment.MACHINE, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 5.0 },
    { name: 'Incline Push-up', equipment: Equipment.BODYWEIGHT, category: ExerciseCategory.COMPOUND, defaultIncrementKg: 0 },
    { name: 'Leg Extension', equipment: Equipment.MACHINE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: 2.5 },
    { name: 'Cable Tricep Pushdown', equipment: Equipment.CABLE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: 2.5 },
    { name: 'Machine Hamstring Curl', equipment: Equipment.MACHINE, category: ExerciseCategory.ISOLATION, defaultIncrementKg: 2.5 },
    { name: 'Dumbbell Lateral Raise', equipment: Equipment.DUMBBELL, category: ExerciseCategory.ISOLATION, defaultIncrementKg: 1.0 },
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

  // Get exercise IDs for referencing
  const exercises = await prisma.exercises.findMany({
    select: { id: true, name: true }
  });
  
  const exerciseMap = exercises.reduce((acc, ex) => {
    acc[ex.name] = ex.id;
    return acc;
  }, {} as Record<string, number>);

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
                { exercise_id: exerciseMap['Barbell High Bar Squat'], sets: 3, reps: 8, weight: null, order: 1 },
                { exercise_id: exerciseMap['Lat Pulldown (neutral grip)'], sets: 3, reps: 8, weight: null, order: 2 },
                { exercise_id: exerciseMap['Trap Bar Deadlift'], sets: 3, reps: 8, weight: null, order: 3 },
                { exercise_id: exerciseMap['Dumbbell Bench Press'], sets: 3, reps: 8, weight: null, order: 4 },
              ]
            }
          },
          {
            name: 'Day 2',
            order: 2,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Barbell High Bar Squat'], sets: 3, reps: 8, weight: null, order: 1 },
                { exercise_id: exerciseMap['Single Arm Dumbbell Row'], sets: 3, reps: 8, weight: null, order: 2 },
                { exercise_id: exerciseMap['Leg Press'], sets: 3, reps: 8, weight: null, order: 3 },
                { exercise_id: exerciseMap['Incline Push-up'], sets: 3, reps: 8, weight: null, order: 4 },
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
                { exercise_id: exerciseMap['Barbell High Bar Squat'], sets: 3, reps: 8, weight: null, order: 1 },
                { exercise_id: exerciseMap['Lat Pulldown (neutral grip)'], sets: 3, reps: 8, weight: null, order: 2 },
                { exercise_id: exerciseMap['Trap Bar Deadlift'], sets: 3, reps: 8, weight: null, order: 3 },
                { exercise_id: exerciseMap['Dumbbell Bench Press'], sets: 3, reps: 8, weight: null, order: 4 },
                { exercise_id: exerciseMap['Leg Extension'], sets: 3, reps: 8, weight: null, order: 5 },
                { exercise_id: exerciseMap['Cable Tricep Pushdown'], sets: 3, reps: 8, weight: null, order: 6 },
              ]
            }
          },
          {
            name: 'Day 2',
            order: 2,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Barbell High Bar Squat'], sets: 3, reps: 8, weight: null, order: 1 },
                { exercise_id: exerciseMap['Single Arm Dumbbell Row'], sets: 3, reps: 8, weight: null, order: 2 },
                { exercise_id: exerciseMap['Leg Press'], sets: 3, reps: 8, weight: null, order: 3 },
                { exercise_id: exerciseMap['Incline Push-up'], sets: 3, reps: 8, weight: null, order: 4 },
                { exercise_id: exerciseMap['Machine Hamstring Curl'], sets: 3, reps: 8, weight: null, order: 5 },
                { exercise_id: exerciseMap['Dumbbell Lateral Raise'], sets: 3, reps: 8, weight: null, order: 6 },
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
