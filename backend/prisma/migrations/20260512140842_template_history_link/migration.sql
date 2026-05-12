/*
  Warnings:

  - You are about to drop the column `setCount` on the `workout_template_exercises` table. All the data in the column will be lost.
  - You are about to drop the column `targetReps` on the `workout_template_exercises` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "workout_template_exercises" DROP COLUMN "setCount",
DROP COLUMN "targetReps";

-- AlterTable
ALTER TABLE "workouts" ADD COLUMN     "templateId" TEXT;

-- CreateIndex
CREATE INDEX "workouts_userId_templateId_date_idx" ON "workouts"("userId", "templateId", "date");

-- AddForeignKey
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "workout_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
