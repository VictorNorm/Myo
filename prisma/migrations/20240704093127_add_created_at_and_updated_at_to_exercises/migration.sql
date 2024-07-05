/*
  Warnings:

  - You are about to drop the `user_completed_exercises` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "workout_exercises" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "user_completed_exercises";
