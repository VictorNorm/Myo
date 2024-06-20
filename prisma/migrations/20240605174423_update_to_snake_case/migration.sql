/*
  Warnings:

  - You are about to drop the column `exerciseId` on the `completed_exercises` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `completed_exercises` table. All the data in the column will be lost.
  - You are about to drop the column `workoutId` on the `completed_exercises` table. All the data in the column will be lost.
  - Added the required column `exercise_id` to the `completed_exercises` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_id` to the `completed_exercises` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workout_id` to the `completed_exercises` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "completed_exercises" DROP CONSTRAINT "completed_exercises_exerciseId_fkey";

-- DropForeignKey
ALTER TABLE "completed_exercises" DROP CONSTRAINT "completed_exercises_userId_fkey";

-- DropForeignKey
ALTER TABLE "completed_exercises" DROP CONSTRAINT "completed_exercises_workoutId_fkey";

-- DropIndex
DROP INDEX "completed_exercises_userId";

-- DropIndex
DROP INDEX "exerciseId";

-- DropIndex
DROP INDEX "workoutId";

-- AlterTable
ALTER TABLE "completed_exercises" DROP COLUMN "exerciseId",
DROP COLUMN "userId",
DROP COLUMN "workoutId",
ADD COLUMN     "exercise_id" INTEGER NOT NULL,
ADD COLUMN     "user_id" INTEGER NOT NULL,
ADD COLUMN     "workout_id" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "completed_exercises_user_id" ON "completed_exercises"("user_id");

-- CreateIndex
CREATE INDEX "completed_exercises_workout_id" ON "completed_exercises"("workout_id");

-- CreateIndex
CREATE INDEX "completed_exercises_exercise_id" ON "completed_exercises"("exercise_id");

-- AddForeignKey
ALTER TABLE "completed_exercises" ADD CONSTRAINT "completed_exercises_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "completed_exercises" ADD CONSTRAINT "completed_exercises_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "completed_exercises" ADD CONSTRAINT "completed_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
