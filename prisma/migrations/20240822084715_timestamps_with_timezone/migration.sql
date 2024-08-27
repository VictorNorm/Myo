/*
  Warnings:

  - The primary key for the `user_stats` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE "completed_exercises" ALTER COLUMN "completedAt" SET DATA TYPE TIMESTAMPTZ(0);

-- AlterTable
ALTER TABLE "exercises" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(0);

-- AlterTable
ALTER TABLE "sessions" ALTER COLUMN "happened" SET DATA TYPE TIMESTAMPTZ(0);

-- AlterTable
ALTER TABLE "user_stats" DROP CONSTRAINT "user_stats_pkey",
ALTER COLUMN "measured" SET DATA TYPE TIMESTAMPTZ(0),
ADD CONSTRAINT "user_stats_pkey" PRIMARY KEY ("measured");

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMPTZ(0),
ALTER COLUMN "verificationTokenExpires" SET DATA TYPE TIMESTAMPTZ(0);

-- AlterTable
ALTER TABLE "workout_exercises" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ(0),
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ(0);
