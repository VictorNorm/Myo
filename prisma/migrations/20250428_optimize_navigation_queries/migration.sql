-- Optimize queries for navigation between screens
-- This addresses slow queries when navigating back to TrainingScreen

-- Optimize the program status count query
-- This helps with the GROUP BY and COUNT operation
CREATE INDEX IF NOT EXISTS idx_programs_count_by_status ON "programs"("userId", "status");

-- Optimize sorting by startDate with status filter (common in UI navigation)
-- This is a more specific index for the common query pattern
CREATE INDEX IF NOT EXISTS idx_programs_status_startdate ON "programs"("status", "userId", "startDate" DESC);

-- Optimize workout template lookup
-- This helps with the slow workouts query
CREATE INDEX IF NOT EXISTS idx_workouts_lookup ON "workouts"("id") INCLUDE ("name", "program_id");

-- Add index to optimize workouts by program relationship
CREATE INDEX IF NOT EXISTS idx_workouts_by_program ON "workouts"("program_id");

-- Run ANALYZE to update statistics for query planner
ANALYZE "programs";
ANALYZE "workouts";