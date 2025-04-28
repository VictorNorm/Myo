-- Optimize ownership verification performance
-- This addresses the "Slow ownership verification" warning in logs

-- Create an optimized index specifically for ownership lookups
-- This helps with quick verification of program ownership by userId and programId
CREATE INDEX IF NOT EXISTS idx_programs_ownership_verification ON "programs"("id", "userId");

-- Create a composite index for program access patterns
-- This helps with queries that filter by userId and verify specific programs
CREATE INDEX IF NOT EXISTS idx_programs_user_access_pattern ON "programs"("userId", "id", "status");

-- Add an index for ownership checks with status filtering
-- This optimizes the common pattern of checking ownership while filtering by status
CREATE INDEX IF NOT EXISTS idx_programs_user_status_checks ON "programs"("userId") 
WHERE "status" = 'ACTIVE';