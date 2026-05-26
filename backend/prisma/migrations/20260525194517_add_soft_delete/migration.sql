-- AlterTable
ALTER TABLE "workouts" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "weight_entries" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "runs" ADD COLUMN "deletedAt" TIMESTAMP(3);
