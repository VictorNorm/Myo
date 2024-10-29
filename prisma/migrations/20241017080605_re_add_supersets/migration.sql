-- CreateTable
CREATE TABLE "supersets" (
    "id" SERIAL NOT NULL,
    "workout_id" INTEGER NOT NULL,
    "first_exercise_id" INTEGER NOT NULL,
    "second_exercise_id" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supersets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supersets_workout_id_idx" ON "supersets"("workout_id");

-- CreateIndex
CREATE INDEX "supersets_first_exercise_id_idx" ON "supersets"("first_exercise_id");

-- CreateIndex
CREATE INDEX "supersets_second_exercise_id_idx" ON "supersets"("second_exercise_id");

-- CreateIndex
CREATE UNIQUE INDEX "supersets_workout_id_first_exercise_id_second_exercise_id_key" ON "supersets"("workout_id", "first_exercise_id", "second_exercise_id");

-- AddForeignKey
ALTER TABLE "supersets" ADD CONSTRAINT "supersets_workout_id_first_exercise_id_fkey" FOREIGN KEY ("workout_id", "first_exercise_id") REFERENCES "workout_exercises"("workout_id", "exercise_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supersets" ADD CONSTRAINT "supersets_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "supersets" ADD CONSTRAINT "supersets_workout_id_second_exercise_id_fkey" FOREIGN KEY ("workout_id", "second_exercise_id") REFERENCES "workout_exercises"("workout_id", "exercise_id") ON DELETE RESTRICT ON UPDATE CASCADE;
