/*
  Warnings:

  - Added the required column `workoutId` to the `completed_exercises` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `completed_exercises` ADD COLUMN `workoutId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `workoutId` ON `completed_exercises`(`workoutId`);

-- AddForeignKey
ALTER TABLE `completed_exercises` ADD CONSTRAINT `completed_exercises_workoutId_fkey` FOREIGN KEY (`workoutId`) REFERENCES `workouts`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
