-- CreateEnum
CREATE TYPE "MuscleGroup" AS ENUM ('Shoulder', 'Arm', 'Chest', 'Abdominal', 'Back', 'Glute', 'Leg', 'Compound');

-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "muscle_group" "MuscleGroup" NOT NULL DEFAULT 'Shoulder';
