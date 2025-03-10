-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" INTEGER NOT NULL,
    "experienceLevel" "ExperienceLevel" NOT NULL DEFAULT 'BEGINNER',
    "barbellIncrement" DECIMAL(4,2) NOT NULL DEFAULT 2.5,
    "dumbbellIncrement" DECIMAL(4,2) NOT NULL DEFAULT 2.0,
    "cableIncrement" DECIMAL(4,2) NOT NULL DEFAULT 2.5,
    "machineIncrement" DECIMAL(4,2) NOT NULL DEFAULT 5.0,
    "useMetric" BOOLEAN NOT NULL DEFAULT true,
    "darkMode" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(0) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
