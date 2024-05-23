-- CreateTable
CREATE TABLE `exercises` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` TEXT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `programs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` TEXT NOT NULL,
    `username` VARCHAR(255) NULL,

    INDEX `username`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sessions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `workout_id` INTEGER NULL,
    `happened` TIMESTAMP(0) NULL,

    INDEX `workout_id`(`workout_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_stats` (
    `username` VARCHAR(255) NULL,
    `measured` TIMESTAMP(0) NOT NULL,
    `stats` JSON NULL,

    INDEX `username`(`username`),
    PRIMARY KEY (`measured`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `username` VARCHAR(255) NOT NULL,
    `password_hash` TEXT NOT NULL,
    `role` ENUM('ADMIN', 'TRAINER', 'USER') NOT NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`username`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workout_exercises` (
    `workout_id` INTEGER NOT NULL,
    `exercise_id` INTEGER NOT NULL,
    `sets` INTEGER NULL,
    `reps` INTEGER NULL,
    `weight` DECIMAL(10, 2) NULL,

    INDEX `exercise_id`(`exercise_id`),
    PRIMARY KEY (`workout_id`, `exercise_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `workouts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` TEXT NOT NULL,
    `program_id` INTEGER NULL,

    INDEX `program_id`(`program_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `programs` ADD CONSTRAINT `programs_ibfk_1` FOREIGN KEY (`username`) REFERENCES `users`(`username`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `user_stats` ADD CONSTRAINT `user_stats_ibfk_1` FOREIGN KEY (`username`) REFERENCES `users`(`username`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `workout_exercises` ADD CONSTRAINT `workout_exercises_ibfk_1` FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `workout_exercises` ADD CONSTRAINT `workout_exercises_ibfk_2` FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `workouts` ADD CONSTRAINT `workouts_ibfk_1` FOREIGN KEY (`program_id`) REFERENCES `programs`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;
