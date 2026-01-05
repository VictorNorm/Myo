-- CreateEnum
CREATE TYPE "MuscleGroupRole" AS ENUM ('PRIMARY', 'SECONDARY');

-- AlterTable
ALTER TABLE "exercise_muscle_groups" ADD COLUMN     "role" "MuscleGroupRole" NOT NULL DEFAULT 'PRIMARY';
