-- CreateTable
CREATE TABLE "muscle_groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "muscle_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_muscle_groups" (
    "exercise_id" INTEGER NOT NULL,
    "muscle_group_id" INTEGER NOT NULL,

    CONSTRAINT "exercise_muscle_groups_pkey" PRIMARY KEY ("exercise_id","muscle_group_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "muscle_groups_name_key" ON "muscle_groups"("name");

-- AddForeignKey
ALTER TABLE "exercise_muscle_groups" ADD CONSTRAINT "exercise_muscle_groups_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_muscle_groups" ADD CONSTRAINT "exercise_muscle_groups_muscle_group_id_fkey" FOREIGN KEY ("muscle_group_id") REFERENCES "muscle_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
