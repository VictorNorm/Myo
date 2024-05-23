-- AlterTable
ALTER TABLE `users` ADD COLUMN `trainerId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `users_trainerId_idx` ON `users`(`trainerId`);

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_trainerId_fkey` FOREIGN KEY (`trainerId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
