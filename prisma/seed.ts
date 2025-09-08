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

  // Create Beginner Full Body template
  const beginnerTemplate = await prisma.program_templates.create({
    data: {
      name: 'Beginner Full Body',
      description: 'Perfect for those new to strength training. 3 full-body workouts per week focusing on compound movements.',
      difficulty_level: 'BEGINNER',
      frequency_per_week: 3,
      duration_weeks: 12,
      category: 'GENERAL',
      goal: 'HYPERTROPHY',
      program_type: 'AUTOMATED',
      template_workouts: {
        create: [
          {
            name: 'Full Body A',
            order: 1,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Squat'], sets: 3, reps: 8, weight: 20.0, order: 1 },
                { exercise_id: exerciseMap['Bench Press'], sets: 3, reps: 8, weight: 40.0, order: 2 },
                { exercise_id: exerciseMap['Barbell Row'], sets: 3, reps: 8, weight: 30.0, order: 3 },
                { exercise_id: exerciseMap['Overhead Press'], sets: 3, reps: 8, weight: 20.0, order: 4 },
                { exercise_id: exerciseMap['Romanian Deadlift'], sets: 3, reps: 10, weight: 30.0, order: 5 },
              ]
            }
          },
          {
            name: 'Full Body B',
            order: 2,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Deadlift'], sets: 3, reps: 5, weight: 40.0, order: 1 },
                { exercise_id: exerciseMap['Incline Dumbbell Press'], sets: 3, reps: 8, weight: 12.5, order: 2 },
                { exercise_id: exerciseMap['Pull-up'], sets: 3, reps: 5, weight: 0, order: 3, notes: 'Assisted if needed' },
                { exercise_id: exerciseMap['Dumbbell Row'], sets: 3, reps: 10, weight: 15.0, order: 4 },
                { exercise_id: exerciseMap['Bulgarian Split Squat'], sets: 3, reps: 8, weight: 10.0, order: 5 },
              ]
            }
          },
          {
            name: 'Full Body C',
            order: 3,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Squat'], sets: 3, reps: 10, weight: 17.5, order: 1 },
                { exercise_id: exerciseMap['Dip'], sets: 3, reps: 6, weight: 0, order: 2, notes: 'Assisted if needed' },
                { exercise_id: exerciseMap['Barbell Row'], sets: 3, reps: 10, weight: 27.5, order: 3 },
                { exercise_id: exerciseMap['Overhead Press'], sets: 3, reps: 10, weight: 17.5, order: 4 },
                { exercise_id: exerciseMap['Romanian Deadlift'], sets: 3, reps: 12, weight: 27.5, order: 5 },
              ]
            }
          }
        ]
      }
    }
  });

  // Create Starting Strength template
  const startingStrengthTemplate = await prisma.program_templates.create({
    data: {
      name: 'Starting Strength',
      description: 'The classic novice strength program focusing on basic compound movements with linear progression.',
      difficulty_level: 'BEGINNER',
      frequency_per_week: 3,
      duration_weeks: 16,
      category: 'STRENGTH',
      goal: 'STRENGTH',
      program_type: 'AUTOMATED',
      template_workouts: {
        create: [
          {
            name: 'Workout A',
            order: 1,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Squat'], sets: 3, reps: 5, weight: 20.0, order: 1 },
                { exercise_id: exerciseMap['Bench Press'], sets: 3, reps: 5, weight: 45.0, order: 2 },
                { exercise_id: exerciseMap['Deadlift'], sets: 1, reps: 5, weight: 60.0, order: 3 },
              ]
            }
          },
          {
            name: 'Workout B',
            order: 2,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Squat'], sets: 3, reps: 5, weight: 20.0, order: 1 },
                { exercise_id: exerciseMap['Overhead Press'], sets: 3, reps: 5, weight: 20.0, order: 2 },
                { exercise_id: exerciseMap['Deadlift'], sets: 1, reps: 5, weight: 60.0, order: 3 },
              ]
            }
          }
        ]
      }
    }
  });

  // Create Upper/Lower Split template
  const upperLowerTemplate = await prisma.program_templates.create({
    data: {
      name: 'Upper/Lower Split',
      description: '4-day upper/lower split focusing on hypertrophy with moderate volume and intensity.',
      difficulty_level: 'INTERMEDIATE',
      frequency_per_week: 4,
      duration_weeks: 8,
      category: 'HYPERTROPHY',
      goal: 'HYPERTROPHY',
      program_type: 'AUTOMATED',
      template_workouts: {
        create: [
          {
            name: 'Upper Body',
            order: 1,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Bench Press'], sets: 4, reps: 8, weight: 50.0, order: 1 },
                { exercise_id: exerciseMap['Barbell Row'], sets: 4, reps: 8, weight: 40.0, order: 2 },
                { exercise_id: exerciseMap['Overhead Press'], sets: 3, reps: 10, weight: 25.0, order: 3 },
                { exercise_id: exerciseMap['Pull-up'], sets: 3, reps: 8, weight: 0, order: 4 },
                { exercise_id: exerciseMap['Incline Dumbbell Press'], sets: 3, reps: 10, weight: 17.5, order: 5 },
                { exercise_id: exerciseMap['Dumbbell Row'], sets: 3, reps: 10, weight: 20.0, order: 6 },
              ]
            }
          },
          {
            name: 'Lower Body',
            order: 2,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Squat'], sets: 4, reps: 8, weight: 60.0, order: 1 },
                { exercise_id: exerciseMap['Romanian Deadlift'], sets: 4, reps: 10, weight: 50.0, order: 2 },
                { exercise_id: exerciseMap['Bulgarian Split Squat'], sets: 3, reps: 10, weight: 15.0, order: 3 },
                { exercise_id: exerciseMap['Deadlift'], sets: 3, reps: 5, weight: 80.0, order: 4 },
              ]
            }
          }
        ]
      }
    }
  });

  // Create 5/3/1 for Beginners template
  const fiveThreeOneTemplate = await prisma.program_templates.create({
    data: {
      name: '5/3/1 for Beginners',
      description: 'Jim Wendler\'s 5/3/1 program adapted for beginners with supplemental work.',
      difficulty_level: 'INTERMEDIATE',
      frequency_per_week: 3,
      duration_weeks: 12,
      category: 'STRENGTH',
      goal: 'STRENGTH',
      program_type: 'MANUAL',
      template_workouts: {
        create: [
          {
            name: 'Day 1',
            order: 1,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Squat'], sets: 3, reps: 5, weight: 0, order: 1, notes: '5/3/1 sets based on training max' },
                { exercise_id: exerciseMap['Bench Press'], sets: 3, reps: 5, weight: 0, order: 2, notes: '5/3/1 sets based on training max' },
                { exercise_id: exerciseMap['Squat'], sets: 5, reps: 5, weight: 0, order: 3, notes: 'FSL sets at 65%' },
                { exercise_id: exerciseMap['Bench Press'], sets: 5, reps: 5, weight: 0, order: 4, notes: 'FSL sets at 65%' },
              ]
            }
          },
          {
            name: 'Day 2',
            order: 2,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Deadlift'], sets: 3, reps: 5, weight: 0, order: 1, notes: '5/3/1 sets based on training max' },
                { exercise_id: exerciseMap['Overhead Press'], sets: 3, reps: 5, weight: 0, order: 2, notes: '5/3/1 sets based on training max' },
                { exercise_id: exerciseMap['Deadlift'], sets: 5, reps: 5, weight: 0, order: 3, notes: 'FSL sets at 65%' },
                { exercise_id: exerciseMap['Overhead Press'], sets: 5, reps: 5, weight: 0, order: 4, notes: 'FSL sets at 65%' },
              ]
            }
          }
        ]
      }
    }
  });

  // Create Push/Pull/Legs template
  const pplTemplate = await prisma.program_templates.create({
    data: {
      name: 'Push/Pull/Legs',
      description: 'High volume 6-day split for experienced lifters focusing on muscle hypertrophy.',
      difficulty_level: 'ADVANCED',
      frequency_per_week: 6,
      duration_weeks: 6,
      category: 'HYPERTROPHY',
      goal: 'HYPERTROPHY',
      program_type: 'MANUAL',
      template_workouts: {
        create: [
          {
            name: 'Push',
            order: 1,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Bench Press'], sets: 4, reps: 6, weight: 70.0, order: 1 },
                { exercise_id: exerciseMap['Incline Dumbbell Press'], sets: 4, reps: 8, weight: 25.0, order: 2 },
                { exercise_id: exerciseMap['Overhead Press'], sets: 4, reps: 8, weight: 35.0, order: 3 },
                { exercise_id: exerciseMap['Dip'], sets: 3, reps: 12, weight: 10.0, order: 4 },
                { exercise_id: exerciseMap['Push-up'], sets: 3, reps: 15, weight: 0, order: 5 },
              ]
            }
          },
          {
            name: 'Pull',
            order: 2,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Deadlift'], sets: 4, reps: 6, weight: 100.0, order: 1 },
                { exercise_id: exerciseMap['Pull-up'], sets: 4, reps: 8, weight: 10.0, order: 2 },
                { exercise_id: exerciseMap['Barbell Row'], sets: 4, reps: 8, weight: 60.0, order: 3 },
                { exercise_id: exerciseMap['Dumbbell Row'], sets: 4, reps: 10, weight: 30.0, order: 4 },
              ]
            }
          },
          {
            name: 'Legs',
            order: 3,
            template_exercises: {
              create: [
                { exercise_id: exerciseMap['Squat'], sets: 4, reps: 8, weight: 80.0, order: 1 },
                { exercise_id: exerciseMap['Romanian Deadlift'], sets: 4, reps: 10, weight: 70.0, order: 2 },
                { exercise_id: exerciseMap['Bulgarian Split Squat'], sets: 3, reps: 12, weight: 20.0, order: 3 },
              ]
            }
          }
        ]
      }
    }
  });

  console.log('Program templates seeded successfully');
  console.log('Created templates:', [
    beginnerTemplate.name,
    startingStrengthTemplate.name,
    upperLowerTemplate.name,
    fiveThreeOneTemplate.name,
    pplTemplate.name
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
