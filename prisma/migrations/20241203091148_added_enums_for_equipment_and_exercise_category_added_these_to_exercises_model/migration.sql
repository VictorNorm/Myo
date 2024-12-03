-- CreateEnum
CREATE TYPE "Equipment" AS ENUM ('DUMBBELL', 'BARBELL', 'CABLE', 'MACHINE', 'BODYWEIGHT');

-- CreateEnum
CREATE TYPE "ExerciseCategory" AS ENUM ('COMPOUND', 'ISOLATION');

-- AlterTable
-- First add the columns as nullable
ALTER TABLE "exercises" 
ADD COLUMN "category" "ExerciseCategory",
ADD COLUMN "defaultIncrementKg" DECIMAL(4,2),
ADD COLUMN "equipment" "Equipment",
ADD COLUMN "maxWeight" DECIMAL(6,2),
ADD COLUMN "minWeight" DECIMAL(6,2),
ADD COLUMN "notes" TEXT;

-- Update existing rows with default values
UPDATE "exercises" SET 
    "equipment" = 'MACHINE',
    "category" = 'COMPOUND'
WHERE "equipment" IS NULL OR "category" IS NULL;

-- Now make the required columns NOT NULL
ALTER TABLE "exercises" 
ALTER COLUMN "category" SET NOT NULL,
ALTER COLUMN "equipment" SET NOT NULL;