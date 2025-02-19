-- CreateEnum
CREATE TYPE "ProgramStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "status" "ProgramStatus" NOT NULL DEFAULT 'PENDING';
