-- AlterTable
ALTER TABLE "weight_entries"
    ADD COLUMN "bodyFatPct" DOUBLE PRECISION,
    ADD COLUMN "muscleMassKg" DOUBLE PRECISION,
    ADD COLUMN "maintenanceKcal" INTEGER,
    ADD COLUMN "metabolicAge" INTEGER,
    ADD COLUMN "visceralFat" DOUBLE PRECISION,
    ADD COLUMN "bmi" DOUBLE PRECISION;
