-- AlterTable
ALTER TABLE "completed_exercises" ADD COLUMN     "rating" INTEGER;

-- CreateTable
CREATE TABLE "progression_history" (
    "id" SERIAL NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "program_id" INTEGER NOT NULL,
    "oldWeight" DECIMAL(10,2) NOT NULL,
    "newWeight" DECIMAL(10,2) NOT NULL,
    "oldReps" INTEGER NOT NULL,
    "newReps" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "progression_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "progression_history_exercise_id_idx" ON "progression_history"("exercise_id");

-- CreateIndex
CREATE INDEX "progression_history_user_id_idx" ON "progression_history"("user_id");

-- CreateIndex
CREATE INDEX "progression_history_program_id_idx" ON "progression_history"("program_id");

-- AddForeignKey
ALTER TABLE "progression_history" ADD CONSTRAINT "progression_history_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progression_history" ADD CONSTRAINT "progression_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progression_history" ADD CONSTRAINT "progression_history_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
