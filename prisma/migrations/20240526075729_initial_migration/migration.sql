-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TRAINER', 'USER');

-- CreateTable
CREATE TABLE "exercises" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

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
    "happened" TIMESTAMP(0),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_stats" (
    "userId" INTEGER NOT NULL,
    "measured" TIMESTAMP(0) NOT NULL,
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
    "created_at" TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
    "trainerId" INTEGER,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_exercises" (
    "workout_id" INTEGER NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "sets" INTEGER,
    "reps" INTEGER,
    "weight" DECIMAL(10,2),

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
    "userId" INTEGER NOT NULL,
    "workoutId" INTEGER NOT NULL,
    "exerciseId" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" INTEGER NOT NULL,
    "weight" DECIMAL(10,2) NOT NULL,
    "completedAt" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "completed_exercises_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "completed_exercises_userId" ON "completed_exercises"("userId");

-- CreateIndex
CREATE INDEX "workoutId" ON "completed_exercises"("workoutId");

-- CreateIndex
CREATE INDEX "exerciseId" ON "completed_exercises"("exerciseId");

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
ALTER TABLE "completed_exercises" ADD CONSTRAINT "completed_exercises_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "completed_exercises" ADD CONSTRAINT "completed_exercises_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "workouts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "completed_exercises" ADD CONSTRAINT "completed_exercises_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "exercises"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
