-- AlterTable
ALTER TABLE "user_goals" ADD COLUMN     "targetDays" TEXT[] DEFAULT ARRAY[]::TEXT[];
