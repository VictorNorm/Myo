-- AlterTable
ALTER TABLE "workout_completions" ADD COLUMN     "is_bad_day" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updated_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "workout_completions_is_bad_day_idx" ON "workout_completions"("is_bad_day");
