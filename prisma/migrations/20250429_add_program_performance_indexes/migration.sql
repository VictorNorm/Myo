-- Add performance indexes for programs queries
-- This addresses slow queries observed in production logs

-- Add index for userId and status combination on programs table
-- This helps with filtering by both userId AND status
CREATE INDEX IF NOT EXISTS idx_programs_userId_status ON "programs"("userId", "status");

-- Add index for programs sorted by startDate 
-- This helps with the ORDER BY operations
CREATE INDEX IF NOT EXISTS idx_programs_startDate ON "programs"("startDate" DESC);

-- Add composite index for the program status count query
-- This helps with the COUNT and GROUP BY operations
CREATE INDEX IF NOT EXISTS idx_programs_userId_status_grouped ON "programs"("userId", "status");