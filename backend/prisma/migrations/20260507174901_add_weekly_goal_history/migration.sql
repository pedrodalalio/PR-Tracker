-- CreateTable
CREATE TABLE "weekly_goal_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weeklyWorkoutGoal" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_goal_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "weekly_goal_history_userId_effectiveFrom_idx" ON "weekly_goal_history"("userId", "effectiveFrom");

-- AddForeignKey
ALTER TABLE "weekly_goal_history" ADD CONSTRAINT "weekly_goal_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
