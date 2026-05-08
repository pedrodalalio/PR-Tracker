/*
  Warnings:

  - A unique constraint covering the columns `[userId,source,externalId]` on the table `runs` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE INDEX "refresh_tokens_userId_isRevoked_idx" ON "refresh_tokens"("userId", "isRevoked");

-- CreateIndex
CREATE UNIQUE INDEX "runs_userId_source_externalId_key" ON "runs"("userId", "source", "externalId");

-- CreateIndex
CREATE INDEX "workouts_userId_date_idx" ON "workouts"("userId", "date");
