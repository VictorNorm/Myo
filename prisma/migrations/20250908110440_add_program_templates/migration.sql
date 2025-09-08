-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "ProgramCategory" AS ENUM ('STRENGTH', 'HYPERTROPHY', 'POWERLIFTING', 'GENERAL');

-- CreateTable
CREATE TABLE "program_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "difficulty_level" "DifficultyLevel" NOT NULL,
    "frequency_per_week" INTEGER NOT NULL,
    "duration_weeks" INTEGER,
    "category" "ProgramCategory" NOT NULL,
    "goal" "Goal" NOT NULL,
    "program_type" "ProgramType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_admin" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_workouts" (
    "id" SERIAL NOT NULL,
    "template_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_exercises" (
    "id" SERIAL NOT NULL,
    "template_workout_id" INTEGER NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weight" DECIMAL(10,2),
    "order" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "template_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "program_templates_difficulty_level_idx" ON "program_templates"("difficulty_level");

-- CreateIndex
CREATE INDEX "program_templates_category_idx" ON "program_templates"("category");

-- CreateIndex
CREATE INDEX "program_templates_goal_idx" ON "program_templates"("goal");

-- CreateIndex
CREATE INDEX "program_templates_is_active_idx" ON "program_templates"("is_active");

-- CreateIndex
CREATE INDEX "template_workouts_template_id_idx" ON "template_workouts"("template_id");

-- CreateIndex
CREATE INDEX "template_workouts_order_idx" ON "template_workouts"("order");

-- CreateIndex
CREATE INDEX "template_exercises_template_workout_id_idx" ON "template_exercises"("template_workout_id");

-- CreateIndex
CREATE INDEX "template_exercises_exercise_id_idx" ON "template_exercises"("exercise_id");

-- CreateIndex
CREATE INDEX "template_exercises_order_idx" ON "template_exercises"("order");

-- AddForeignKey
ALTER TABLE "template_workouts" ADD CONSTRAINT "template_workouts_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "program_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_exercises" ADD CONSTRAINT "template_exercises_template_workout_id_fkey" FOREIGN KEY ("template_workout_id") REFERENCES "template_workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_exercises" ADD CONSTRAINT "template_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;