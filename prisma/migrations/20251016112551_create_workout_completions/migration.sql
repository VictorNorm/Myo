-- CreateTable
CREATE TABLE "public"."workout_completions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "program_id" INTEGER NOT NULL,
    "workout_id" INTEGER NOT NULL,
    "completed_at" TIMESTAMPTZ(0) NOT NULL,
    "duration_minutes" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_completions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workout_completions_user_program_date_idx" ON "public"."workout_completions"("user_id", "program_id", "completed_at" DESC);

-- CreateIndex
CREATE INDEX "workout_completions_workout_id_idx" ON "public"."workout_completions"("workout_id");

-- AddForeignKey
ALTER TABLE "public"."workout_completions" ADD CONSTRAINT "workout_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workout_completions" ADD CONSTRAINT "workout_completions_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."workout_completions" ADD CONSTRAINT "workout_completions_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
