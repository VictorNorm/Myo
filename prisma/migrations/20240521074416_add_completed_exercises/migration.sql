-- CreateTable
CREATE TABLE `completed_exercises` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `exerciseId` INTEGER NOT NULL,
    `sets` INTEGER NOT NULL,
    `reps` INTEGER NOT NULL,
    `weight` DECIMAL(10, 2) NOT NULL,
    `completedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `userId`(`userId`),
    INDEX `exerciseId`(`exerciseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `completed_exercises` ADD CONSTRAINT `completed_exercises_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `completed_exercises` ADD CONSTRAINT `completed_exercises_exerciseId_fkey` FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
