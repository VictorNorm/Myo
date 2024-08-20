-- This migration is used to sync Prisma's understanding of the schema
-- without making any actual changes to the database

-- We'll create a dummy table and immediately drop it
-- This allows Prisma to track this migration without affecting the actual schema

CREATE TABLE IF NOT EXISTS "__prisma_sync" (
    "id" SERIAL PRIMARY KEY,
    "applied" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TABLE "__prisma_sync";