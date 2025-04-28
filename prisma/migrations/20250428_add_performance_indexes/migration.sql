-- Add index for workouts.id to improve lookup performance
CREATE INDEX IF NOT EXISTS idx_workouts_id ON workouts(id);

-- Add indexes for completed_exercises queries
CREATE INDEX IF NOT EXISTS idx_completed_exercises_user_workout 
ON completed_exercises(user_id, workout_id);

CREATE INDEX IF NOT EXISTS idx_completed_exercises_exercise_completed_at 
ON completed_exercises(exercise_id, "completedAt" DESC);

-- Add composite index for the DISTINCT ON query pattern
CREATE INDEX IF NOT EXISTS idx_completed_exercises_user_workout_exercise_completed
ON completed_exercises(user_id, workout_id, exercise_id, "completedAt" DESC);

-- Add indexes for programs table
CREATE INDEX IF NOT EXISTS idx_programs_userid_status 
ON programs("userId", status);

-- Analyze tables to update query planner statistics
ANALYZE workouts;
ANALYZE completed_exercises;
ANALYZE programs;