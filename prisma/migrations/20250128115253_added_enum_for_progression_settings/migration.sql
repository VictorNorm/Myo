/*
  Warnings:

  - The `experienceLevel` column on the `program_progression_settings` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- AlterTable
ALTER TABLE "program_progression_settings" DROP COLUMN "experienceLevel",
ADD COLUMN     "experienceLevel" "ExperienceLevel" NOT NULL DEFAULT 'BEGINNER';
