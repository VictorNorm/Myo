/*
  Warnings:

  - Added the required column `order` to the `workout_exercises` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "workout_exercises" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
