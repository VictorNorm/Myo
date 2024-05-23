/*
  Warnings:

  - You are about to drop the column `username` on the `programs` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `user_stats` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `user_stats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstname` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `programs` DROP FOREIGN KEY `programs_ibfk_1`;

-- DropForeignKey
ALTER TABLE `user_stats` DROP FOREIGN KEY `user_stats_ibfk_1`;

-- AlterTable
ALTER TABLE `programs` DROP COLUMN `username`,
    ADD COLUMN `userId` INTEGER NULL;

-- AlterTable
ALTER TABLE `user_stats` DROP COLUMN `username`,
    ADD COLUMN `userId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `users` DROP PRIMARY KEY,
    ADD COLUMN `firstname` VARCHAR(191) NOT NULL,
    ADD COLUMN `id` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`id`);

-- CreateIndex
CREATE INDEX `userId` ON `programs`(`userId`);

-- CreateIndex
CREATE INDEX `userId` ON `user_stats`(`userId`);

-- CreateIndex
CREATE UNIQUE INDEX `users_username_key` ON `users`(`username`);

-- AddForeignKey
ALTER TABLE `programs` ADD CONSTRAINT `programs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_stats` ADD CONSTRAINT `user_stats_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
