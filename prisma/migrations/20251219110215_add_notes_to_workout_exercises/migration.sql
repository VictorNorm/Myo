/*
  Warnings:

  - You are about to drop the column `notes` on the `exercises` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "exercises" DROP COLUMN "notes";

-- AlterTable
ALTER TABLE "workout_exercises" ADD COLUMN     "notes" TEXT;
