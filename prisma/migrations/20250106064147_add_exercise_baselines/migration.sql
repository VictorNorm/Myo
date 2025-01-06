-- CreateTable
CREATE TABLE "exercise_baselines" (
    "id" SERIAL NOT NULL,
    "exercise_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "program_id" INTEGER NOT NULL,
    "weight" DECIMAL(6,2) NOT NULL,
    "reps" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_baselines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exercise_baselines_exercise_id_idx" ON "exercise_baselines"("exercise_id");

-- CreateIndex
CREATE INDEX "exercise_baselines_user_id_idx" ON "exercise_baselines"("user_id");

-- CreateIndex
CREATE INDEX "exercise_baselines_program_id_idx" ON "exercise_baselines"("program_id");

-- CreateIndex
CREATE UNIQUE INDEX "exercise_baselines_exercise_id_user_id_program_id_key" ON "exercise_baselines"("exercise_id", "user_id", "program_id");

-- AddForeignKey
ALTER TABLE "exercise_baselines" ADD CONSTRAINT "exercise_baselines_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_baselines" ADD CONSTRAINT "exercise_baselines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_baselines" ADD CONSTRAINT "exercise_baselines_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
