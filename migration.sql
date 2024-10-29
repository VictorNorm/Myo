-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TRAINER', 'USER');

-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('Shoulder', 'Arm', 'Chest', 'Abdominal', 'Back', 'Glute', 'Leg', 'Compound');

-- CreateTable
CREATE TABLE "exercises" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" SERIAL NOT NULL,
    "workout_id" INTEGER,
    "happened" TIMESTAMPTZ(0),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stats" (
    "userId" INTEGER NOT NULL,
    "measured" TIMESTAMPTZ(0) NOT NULL,
    "stats" JSONB,

    CONSTRAINT "user_stats_pkey" PRIMARY KEY ("measured")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "password_hash" TEXT NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMPTZ(0) DEFAULT CURRENT_TIMESTAMP,
    "trainerId" INTEGER,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "verificationTokenExpires" TIMESTAMPTZ(0),
    "resetToken" TEXT,
    "resetTokenExpiry" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_exercises" (
    "workout_id" INTEGER NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "sets" INTEGER,
    "reps" INTEGER,
    "weight" DECIMAL(10,2),
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_exercises_pkey" PRIMARY KEY ("workout_id","exercise_id")
);

-- CreateTable
CREATE TABLE "workouts" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "program_id" INTEGER,

    CONSTRAINT "workouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "completed_exercises" (
    "id" SERIAL NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weight" DECIMAL(10,2) NOT NULL,
    "completedAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exercise_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "workout_id" INTEGER NOT NULL,

    CONSTRAINT "completed_exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "muscle_groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "muscle_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_muscle_groups" (
    "exercise_id" INTEGER NOT NULL,
    "muscle_group_id" INTEGER NOT NULL,

    CONSTRAINT "exercise_muscle_groups_pkey" PRIMARY KEY ("exercise_id","muscle_group_id")
);

-- CreateTable
CREATE TABLE "supersets" (
    "id" SERIAL NOT NULL,
    "workout_id" INTEGER NOT NULL,
    "first_exercise_id" INTEGER NOT NULL,
    "second_exercise_id" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supersets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "exercises_name_key" ON "exercises"("name");

-- CreateIndex
CREATE INDEX "programs_userId" ON "programs"("userId");

-- CreateIndex
CREATE INDEX "workout_id" ON "sessions"("workout_id");

-- CreateIndex
CREATE INDEX "user_stats_userId" ON "user_stats"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_trainerId_idx" ON "users"("trainerId");

-- CreateIndex
CREATE INDEX "exercise_id" ON "workout_exercises"("exercise_id");

-- CreateIndex
CREATE INDEX "program_id" ON "workouts"("program_id");

-- CreateIndex
CREATE INDEX "completed_exercises_user_id" ON "completed_exercises"("user_id");

-- CreateIndex
CREATE INDEX "completed_exercises_workout_id" ON "completed_exercises"("workout_id");

-- CreateIndex
CREATE INDEX "completed_exercises_exercise_id" ON "completed_exercises"("exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "muscle_groups_name_key" ON "muscle_groups"("name");

-- CreateIndex
CREATE INDEX "supersets_workout_id_idx" ON "supersets"("workout_id");

-- CreateIndex
CREATE INDEX "supersets_first_exercise_id_idx" ON "supersets"("first_exercise_id");

-- CreateIndex
CREATE INDEX "supersets_second_exercise_id_idx" ON "supersets"("second_exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "supersets_workout_id_first_exercise_id_second_exercise_id_key" ON "supersets"("workout_id", "first_exercise_id", "second_exercise_id");

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_ibfk_1" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_stats" ADD CONSTRAINT "user_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_ibfk_1" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workout_exercises" ADD CONSTRAINT "workout_exercises_ibfk_2" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_ibfk_1" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "completed_exercises" ADD CONSTRAINT "completed_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "completed_exercises" ADD CONSTRAINT "completed_exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "completed_exercises" ADD CONSTRAINT "completed_exercises_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exercise_muscle_groups" ADD CONSTRAINT "exercise_muscle_groups_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_muscle_groups" ADD CONSTRAINT "exercise_muscle_groups_muscle_group_id_fkey" FOREIGN KEY ("muscle_group_id") REFERENCES "muscle_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supersets" ADD CONSTRAINT "supersets_workout_id_first_exercise_id_fkey" FOREIGN KEY ("workout_id", "first_exercise_id") REFERENCES "workout_exercises"("workout_id", "exercise_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supersets" ADD CONSTRAINT "supersets_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supersets" ADD CONSTRAINT "supersets_workout_id_second_exercise_id_fkey" FOREIGN KEY ("workout_id", "second_exercise_id") REFERENCES "workout_exercises"("workout_id", "exercise_id") ON DELETE RESTRICT ON UPDATE CASCADE;

