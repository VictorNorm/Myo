-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "user_completed_exercises" (
    "exercise_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "exercise_name" TEXT NOT NULL,

    CONSTRAINT "user_completed_exercises_pkey" PRIMARY KEY ("exercise_id","user_id","completedAt")
);
