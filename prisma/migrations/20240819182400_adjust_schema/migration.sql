-- Create new tables if they don't exist

-- Create muscle_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS "muscle_groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "muscle_groups_pkey" PRIMARY KEY ("id")
);

-- Create exercise_muscle_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS "exercise_muscle_groups" (
    "exercise_id" INTEGER NOT NULL,
    "muscle_group_id" INTEGER NOT NULL,
    CONSTRAINT "exercise_muscle_groups_pkey" PRIMARY KEY ("exercise_id","muscle_group_id")
);

-- Create indexes if they don't exist
CREATE UNIQUE INDEX IF NOT EXISTS "muscle_groups_name_key" ON "muscle_groups"("name");

-- Add foreign keys if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exercise_muscle_groups_exercise_id_fkey') THEN
        ALTER TABLE "exercise_muscle_groups" ADD CONSTRAINT "exercise_muscle_groups_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'exercise_muscle_groups_muscle_group_id_fkey') THEN
        ALTER TABLE "exercise_muscle_groups" ADD CONSTRAINT "exercise_muscle_groups_muscle_group_id_fkey" FOREIGN KEY ("muscle_group_id") REFERENCES "muscle_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Remove muscle_group column from exercises if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exercises' AND column_name = 'muscle_group') THEN
        ALTER TABLE "exercises" DROP COLUMN "muscle_group";
    END IF;
END $$;