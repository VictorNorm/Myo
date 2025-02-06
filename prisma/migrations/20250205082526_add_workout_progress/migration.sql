-- AlterTable
ALTER TABLE "programs" ADD COLUMN     "totalWorkouts" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "workout_progress" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "program_id" INTEGER NOT NULL,
    "workout_id" INTEGER NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "next_scheduled_at" TIMESTAMP(3),
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workout_progress_user_id_idx" ON "workout_progress"("user_id");

-- CreateIndex
CREATE INDEX "workout_progress_program_id_idx" ON "workout_progress"("program_id");

-- CreateIndex
CREATE INDEX "workout_progress_workout_id_idx" ON "workout_progress"("workout_id");

-- CreateIndex
CREATE UNIQUE INDEX "workout_progress_user_id_program_id_workout_id_key" ON "workout_progress"("user_id", "program_id", "workout_id");

-- AddForeignKey
ALTER TABLE "workout_progress" ADD CONSTRAINT "workout_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_progress" ADD CONSTRAINT "workout_progress_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_progress" ADD CONSTRAINT "workout_progress_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
