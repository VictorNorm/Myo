-- DropIndex
DROP INDEX "idx_completed_exercises_exercise_completed_at";

-- DropIndex
DROP INDEX "idx_completed_exercises_user_workout";

-- DropIndex
DROP INDEX "idx_completed_exercises_user_workout_exercise_completed";

-- DropIndex
DROP INDEX "idx_programs_count_by_status";

-- DropIndex
DROP INDEX "idx_programs_ownership_verification";

-- DropIndex
DROP INDEX "idx_programs_startdate";

-- DropIndex
DROP INDEX "idx_programs_status_startdate";

-- DropIndex
DROP INDEX "idx_programs_user_access_pattern";

-- DropIndex
DROP INDEX "idx_programs_userid_status";

-- DropIndex
DROP INDEX "idx_programs_userid_status_grouped";

-- DropIndex
DROP INDEX "idx_workouts_id";

-- DropIndex
DROP INDEX "idx_workouts_lookup";

-- AlterTable
ALTER TABLE "exercises" ADD COLUMN     "videoUrl" TEXT;
