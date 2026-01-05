/**
 * Muscle Group Population Script for Myo
 * 
 * This script populates the exercise_muscle_groups table with
 * primary and secondary muscle group assignments for all exercises.
 * 
 * USAGE:
 * 1. First run the Prisma migration to add the 'role' field
 * 2. Copy this file to your myo-api/scripts folder
 * 3. Run: npx ts-node scripts/populateMuscleGroups.ts
 * 
 * Or run directly with DATABASE_URL set:
 * DATABASE_URL="your_connection_string" npx ts-node scripts/populateMuscleGroups.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================================
// MUSCLE GROUP DEFINITIONS
// These should match your muscle_groups table
// ============================================================

const MUSCLE_GROUPS = {
  BACK: 'Back',
  CALVES: 'Calves',
  CHEST: 'Chest',
  GLUTES: 'Glutes',
  CORE: 'Core',
  BICEPS: 'Biceps',
  TRICEPS: 'Triceps',
  FOREARMS: 'Forearms',
  QUADRICEPS: 'Quadriceps',
  HAMSTRINGS: 'Hamstrings',
  ANTERIOR_DELTOIDS: 'Anterior Deltoids',
  LATERAL_DELTOIDS: 'Lateral Deltoids',
  POSTERIOR_DELTOIDS: 'Posterior Deltoids',
  TRAPS: 'Traps',
} as const;

type MuscleGroupName = typeof MUSCLE_GROUPS[keyof typeof MUSCLE_GROUPS];

interface MuscleGroupAssignment {
  primary: MuscleGroupName[];
  secondary: MuscleGroupName[];
}

// ============================================================
// EXERCISE TO MUSCLE GROUP MAPPINGS
// Primary = main target muscle(s)
// Secondary = assisting/stabilizing muscles
// ============================================================

const exerciseMappings: Record<string, MuscleGroupAssignment> = {
  // ==================== SQUATS & QUAD DOMINANT ====================
  'Barbell high bar squat': {
    primary: ['Quadriceps', 'Glutes'],
    secondary: ['Hamstrings', 'Core'],
  },
  'Barbell low bar squat': {
    primary: ['Quadriceps', 'Glutes'],
    secondary: ['Hamstrings', 'Core', 'Back'],
  },
  'Front squat': {
    primary: ['Quadriceps'],
    secondary: ['Glutes', 'Core'],
  },
  'Leg press': {
    primary: ['Quadriceps', 'Glutes'],
    secondary: ['Hamstrings'],
  },
  'Smith machine squat': {
    primary: ['Quadriceps', 'Glutes'],
    secondary: ['Hamstrings'],
  },
  'Leg extension': {
    primary: ['Quadriceps'],
    secondary: [],
  },
  'Step up': {
    primary: ['Quadriceps', 'Glutes'],
    secondary: ['Hamstrings', 'Core'],
  },

  // ==================== LUNGES ====================
  'Dumbbell forward lunge': {
    primary: ['Quadriceps', 'Glutes'],
    secondary: ['Hamstrings', 'Core'],
  },
  'Backward lunge': {
    primary: ['Quadriceps', 'Glutes'],
    secondary: ['Hamstrings', 'Core'],
  },

  // ==================== DEADLIFTS & HIP HINGE ====================
  'Barbell deadlift': {
    primary: ['Back', 'Glutes', 'Hamstrings'],
    secondary: ['Quadriceps', 'Core', 'Traps', 'Forearms'],
  },
  'Trap bar deadlift': {
    primary: ['Quadriceps', 'Glutes', 'Back'],
    secondary: ['Hamstrings', 'Core', 'Traps', 'Forearms'],
  },
  'Romanian deadlift': {
    primary: ['Hamstrings', 'Glutes'],
    secondary: ['Back', 'Core'],
  },
  'Barbell hip thrust': {
    primary: ['Glutes'],
    secondary: ['Hamstrings', 'Core'],
  },
  'Back extension': {
    primary: ['Back', 'Glutes'],
    secondary: ['Hamstrings'],
  },
  'Jefferson curl': {
    primary: ['Hamstrings', 'Back'],
    secondary: ['Glutes'],
  },

  // ==================== HAMSTRINGS ISOLATION ====================
  'Machine hamstring curl': {
    primary: ['Hamstrings'],
    secondary: [],
  },
  'Nordic hamstring': {
    primary: ['Hamstrings'],
    secondary: ['Glutes'],
  },

  // ==================== CHEST PRESSING ====================
  'Barbell bench press': {
    primary: ['Chest'],
    secondary: ['Anterior Deltoids', 'Triceps'],
  },
  'Incline barbell bench press': {
    primary: ['Chest', 'Anterior Deltoids'],
    secondary: ['Triceps'],
  },
  'Dumbbell bench press': {
    primary: ['Chest'],
    secondary: ['Anterior Deltoids', 'Triceps'],
  },
  'Incline dumbbell bench press': {
    primary: ['Chest', 'Anterior Deltoids'],
    secondary: ['Triceps'],
  },
  'Close grip bench press': {
    primary: ['Triceps', 'Chest'],
    secondary: ['Anterior Deltoids'],
  },

  // ==================== PUSH UPS & DIPS ====================
  'Pushup': {
    primary: ['Chest'],
    secondary: ['Anterior Deltoids', 'Triceps', 'Core'],
  },
  'Incline pushup': {
    primary: ['Chest'],
    secondary: ['Anterior Deltoids', 'Triceps', 'Core'],
  },
  'Deficit pushup': {
    primary: ['Chest'],
    secondary: ['Anterior Deltoids', 'Triceps', 'Core'],
  },
  'Dips': {
    primary: ['Chest', 'Triceps'],
    secondary: ['Anterior Deltoids'],
  },

  // ==================== CHEST FLYES ====================
  'Cable fly': {
    primary: ['Chest'],
    secondary: [],
  },
  'Dumbbell chest fly': {
    primary: ['Chest'],
    secondary: [],
  },

  // ==================== ROWS (BACK) ====================
  'Barbell bent over row': {
    primary: ['Back'],
    secondary: ['Biceps', 'Posterior Deltoids', 'Core'],
  },
  'T bar row': {
    primary: ['Back'],
    secondary: ['Biceps', 'Posterior Deltoids'],
  },
  'Single arm dumbbell row': {
    primary: ['Back'],
    secondary: ['Biceps', 'Posterior Deltoids', 'Core'],
  },
  'Chest supported dumbbell high row': {
    primary: ['Back', 'Posterior Deltoids'],
    secondary: ['Biceps'],
  },
  'Chest supported dumbbell reverse fly': {
    primary: ['Posterior Deltoids', 'Back'],
    secondary: [],
  },
  'Seated cable row, neutral grip': {
    primary: ['Back'],
    secondary: ['Biceps', 'Posterior Deltoids'],
  },

  // ==================== PULL UPS & CHIN UPS ====================
  'Pullup': {
    primary: ['Back'],
    secondary: ['Biceps', 'Core'],
  },
  'Pullup, machine assisted': {
    primary: ['Back'],
    secondary: ['Biceps'],
  },
  'Chin-up': {
    primary: ['Back', 'Biceps'],
    secondary: ['Core'],
  },
  'Chin-up, machine assisted': {
    primary: ['Back', 'Biceps'],
    secondary: [],
  },
  'Chin-up, neutral': {
    primary: ['Back', 'Biceps'],
    secondary: ['Core'],
  },

  // ==================== LAT PULLDOWNS ====================
  'Lat pulldown, neutral': {
    primary: ['Back'],
    secondary: ['Biceps'],
  },
  'Lat pulldown, pronated': {
    primary: ['Back'],
    secondary: ['Biceps'],
  },
  'Lat pulldown, supinated': {
    primary: ['Back', 'Biceps'],
    secondary: [],
  },
  'Lat pulldown neutral wide': {
    primary: ['Back'],
    secondary: ['Biceps'],
  },

  // ==================== SHOULDER PRESSING ====================
  'Seated dumbbell overhead press': {
    primary: ['Anterior Deltoids', 'Lateral Deltoids'],
    secondary: ['Triceps', 'Core'],
  },

  // ==================== LATERAL RAISES (SIDE DELTS) ====================
  'Dumbbell lateral raise': {
    primary: ['Lateral Deltoids'],
    secondary: [],
  },
  'Seated dumbbell lateral raise': {
    primary: ['Lateral Deltoids'],
    secondary: [],
  },
  'Lean in dumbbell lateral raise': {
    primary: ['Lateral Deltoids'],
    secondary: [],
  },
  'Single arm cable lateral raise': {
    primary: ['Lateral Deltoids'],
    secondary: [],
  },

  // ==================== REAR DELT ====================
  'Bent over dumbbell rear delt fly': {
    primary: ['Posterior Deltoids'],
    secondary: ['Back'],
  },
  'Cable rear delt fly': {
    primary: ['Posterior Deltoids'],
    secondary: ['Back'],
  },
  'Cable rear delt fly, high angle': {
    primary: ['Posterior Deltoids'],
    secondary: ['Back'],
  },
  'Chest supported dumbbell rear delt fly': {
    primary: ['Posterior Deltoids'],
    secondary: ['Back'],
  },

  // ==================== BICEPS ====================
  'Barbell bicep curl': {
    primary: ['Biceps'],
    secondary: ['Forearms'],
  },
  'Dumbbell bicep curl': {
    primary: ['Biceps'],
    secondary: ['Forearms'],
  },
  'EZ bar bicep curl': {
    primary: ['Biceps'],
    secondary: ['Forearms'],
  },
  'Incline dumbbell bicep curl': {
    primary: ['Biceps'],
    secondary: ['Forearms'],
  },
  'Incline dumbbell hammer curl': {
    primary: ['Biceps', 'Forearms'],
    secondary: [],
  },
  'Cable bicep curl, straight bar': {
    primary: ['Biceps'],
    secondary: ['Forearms'],
  },
  'Single cable bicep curl': {
    primary: ['Biceps'],
    secondary: ['Forearms'],
  },
  'Dual cable bicep curl': {
    primary: ['Biceps'],
    secondary: ['Forearms'],
  },

  // ==================== TRICEPS ====================
  'Cable tricep pushdown, bar': {
    primary: ['Triceps'],
    secondary: [],
  },
  'Cable overhead tricep press, bar': {
    primary: ['Triceps'],
    secondary: [],
  },
  'Cable overhead tricep press, rope attachment': {
    primary: ['Triceps'],
    secondary: [],
  },
  'Dumbbell skull crusher': {
    primary: ['Triceps'],
    secondary: [],
  },
  'EZ bar skull crusher': {
    primary: ['Triceps'],
    secondary: [],
  },
  'EZ bar overhead tricep press': {
    primary: ['Triceps'],
    secondary: [],
  },

  // ==================== FOREARMS ====================
  'Barbell forearm curls': {
    primary: ['Forearms'],
    secondary: [],
  },

  // ==================== TRAPS ====================
  'Barbell shrugs': {
    primary: ['Traps'],
    secondary: ['Forearms'],
  },
  'Dumbbell shrugs': {
    primary: ['Traps'],
    secondary: ['Forearms'],
  },

  // ==================== CALVES ====================
  'Dumbbell standing calf raise': {
    primary: ['Calves'],
    secondary: [],
  },
  'Leg press calf raise': {
    primary: ['Calves'],
    secondary: [],
  },
  'Smith machine calf raise': {
    primary: ['Calves'],
    secondary: [],
  },

  // ==================== CORE ====================
  'Ab rollout': {
    primary: ['Core'],
    secondary: ['Anterior Deltoids'],
  },

  // ==================== NEW EXERCISES (Jan 2025) ====================
  
  // Smith machine pressing
  'Smith machine incline bench press': {
    primary: ['Chest', 'Anterior Deltoids'],
    secondary: ['Triceps'],
  },
  'Smith machine bench press': {
    primary: ['Chest'],
    secondary: ['Anterior Deltoids', 'Triceps'],
  },

  'Barbell incline bench press': {
    primary: ['Chest', 'Anterior Deltoids'],
    secondary: ['Triceps'],
  },
  'Reverse deficit lunge': {
    primary: ['Quadriceps', 'Glutes'],
    secondary: ['Hamstrings', 'Core'],
  },

  // Squats & Lunges
  'Goblet squat': {
    primary: ['Quadriceps', 'Glutes'],
    secondary: ['Core'],
  },
  'Dumbbell Bulgarian split squat': {
    primary: ['Quadriceps', 'Glutes'],
    secondary: ['Hamstrings', 'Core'],
  },
  'Barbell Bulgarian split squat': {
    primary: ['Quadriceps', 'Glutes'],
    secondary: ['Hamstrings', 'Core'],
  },

  // Overhead pressing
  'Dumbbell overhead press': {
    primary: ['Anterior Deltoids', 'Lateral Deltoids'],
    secondary: ['Triceps', 'Core'],
  },
  'Barbell overhead press': {
    primary: ['Anterior Deltoids', 'Lateral Deltoids'],
    secondary: ['Triceps', 'Core'],
  },

  // Rows
  'Inverted row': {
    primary: ['Back'],
    secondary: ['Biceps', 'Posterior Deltoids', 'Core'],
  },
  'Barbell flexion row': {
    primary: ['Back'],
    secondary: ['Biceps', 'Posterior Deltoids'],
  },

  // Hip hinge
  'Stiff legged deadlift': {
    primary: ['Hamstrings', 'Glutes'],
    secondary: ['Back', 'Core'],
  },
};

// ============================================================
// MAIN SCRIPT
// ============================================================

async function main() {
  console.log('🏋️ Starting Muscle Group Population Script...\n');

  // Step 1: Ensure all muscle groups exist
  console.log('📋 Step 1: Ensuring muscle groups exist...');
  const muscleGroupIds: Record<string, number> = {};
  
  for (const groupName of Object.values(MUSCLE_GROUPS)) {
    let muscleGroup = await prisma.muscle_groups.findFirst({
      where: { name: groupName },
    });
    
    if (!muscleGroup) {
      console.log(`  Creating muscle group: ${groupName}`);
      muscleGroup = await prisma.muscle_groups.create({
        data: { name: groupName },
      });
    }
    
    muscleGroupIds[groupName] = muscleGroup.id;
  }
  
  console.log(`  ✅ ${Object.keys(muscleGroupIds).length} muscle groups ready\n`);
  console.log('  Muscle Group IDs:', muscleGroupIds);
  console.log('');

  // Step 2: Get all exercises
  console.log('📋 Step 2: Fetching exercises from database...');
  const exercises = await prisma.exercises.findMany({
    select: { id: true, name: true },
  });
  console.log(`  Found ${exercises.length} exercises\n`);

  // Step 3: Clear existing mappings
  console.log('📋 Step 3: Clearing existing exercise_muscle_groups entries...');
  const deleted = await prisma.exercise_muscle_groups.deleteMany({});
  console.log(`  Deleted ${deleted.count} existing entries\n`);

  // Step 4: Create new mappings
  console.log('📋 Step 4: Creating new muscle group mappings...\n');
  
  let totalMappings = 0;
  let unmappedExercises: string[] = [];

  for (const exercise of exercises) {
    const mapping = exerciseMappings[exercise.name];
    
    if (!mapping) {
      unmappedExercises.push(exercise.name);
      continue;
    }

    // Create primary mappings
    for (const muscleGroupName of mapping.primary) {
      const muscleGroupId = muscleGroupIds[muscleGroupName];
      if (!muscleGroupId) {
        console.log(`  ⚠️ Warning: Muscle group "${muscleGroupName}" not found for ${exercise.name}`);
        continue;
      }

      await prisma.exercise_muscle_groups.create({
        data: {
          exercise_id: exercise.id,
          muscle_group_id: muscleGroupId,
          role: 'PRIMARY',
        },
      });
      totalMappings++;
    }

    // Create secondary mappings
    for (const muscleGroupName of mapping.secondary) {
      const muscleGroupId = muscleGroupIds[muscleGroupName];
      if (!muscleGroupId) {
        console.log(`  ⚠️ Warning: Muscle group "${muscleGroupName}" not found for ${exercise.name}`);
        continue;
      }

      await prisma.exercise_muscle_groups.create({
        data: {
          exercise_id: exercise.id,
          muscle_group_id: muscleGroupId,
          role: 'SECONDARY',
        },
      });
      totalMappings++;
    }

    const primaryCount = mapping.primary.length;
    const secondaryCount = mapping.secondary.length;
    console.log(`  ✅ ${exercise.name}: ${primaryCount} primary, ${secondaryCount} secondary`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total exercises in database: ${exercises.length}`);
  console.log(`Exercises with mappings: ${exercises.length - unmappedExercises.length}`);
  console.log(`Total mappings created: ${totalMappings}`);
  
  if (unmappedExercises.length > 0) {
    console.log(`\n⚠️ Unmapped exercises (${unmappedExercises.length}):`);
    unmappedExercises.forEach(name => console.log(`  - ${name}`));
    console.log('\n👆 Add these to the exerciseMappings object and run again.');
  } else {
    console.log('\n🎉 All exercises have been mapped!');
  }

  console.log('\n✅ Script completed successfully!');
}

main()
  .catch((error) => {
    console.error('❌ Error running script:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
