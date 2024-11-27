-- CreateEnum
CREATE TYPE "ProgramType" AS ENUM ('PT_MANAGED', 'AI_ASSISTED');

-- CreateEnum
CREATE TYPE "Goal" AS ENUM ('HYPERTROPHY', 'STRENGTH');

-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "endDate" TIMESTAMPTZ(0),
ADD COLUMN     "goal" "Goal" NOT NULL DEFAULT 'HYPERTROPHY',
ADD COLUMN     "programType" "ProgramType" NOT NULL DEFAULT 'PT_MANAGED',
ADD COLUMN     "startDate" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "program_progression_settings" (
    "id" SERIAL NOT NULL,
    "program_id" INTEGER NOT NULL,
    "experienceLevel" TEXT NOT NULL,
    "weeklyFrequency" INTEGER NOT NULL,
    "lastDeloadDate" TIMESTAMPTZ(0),
    "nextDeloadDate" TIMESTAMPTZ(0),

    CONSTRAINT "program_progression_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "program_progression_settings_program_id_key" ON "program_progression_settings"("program_id");

-- AddForeignKey
ALTER TABLE "program_progression_settings" ADD CONSTRAINT "program_progression_settings_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
