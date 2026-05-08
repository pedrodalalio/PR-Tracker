import { z } from "zod";
import { apiClient, NetworkError } from "@/lib/api-client";
import { db } from "@/lib/db";
import { enqueueOutbox } from "@/lib/sync";
import {
  userGoalsSchema,
  weeklyGoalEntrySchema,
  weeklyProgressSchema,
  type UserGoals,
  type WeekDay,
  type WeeklyGoalEntry,
  type WeeklyProgress,
} from "@/lib/types";

export interface UpdateGoalsInput {
  weeklyWorkoutGoal?: number;
  targetDays?: WeekDay[];
}

interface GoalsResponse {
  goals: UserGoals;
}
interface ProgressResponse {
  progress: WeeklyProgress;
}
interface HistoryResponse {
  history: WeeklyGoalEntry[];
}

const historySchema = z.array(weeklyGoalEntrySchema);

export const goalsApi = {
  async get(): Promise<UserGoals> {
    try {
      const data = await apiClient.get<GoalsResponse>("/goals");
      const parsed = userGoalsSchema.parse(data.goals);
      await db.goals.put(parsed);
      return parsed;
    } catch (err) {
      if (err instanceof NetworkError) {
        const cached = await db.goals.toCollection().first();
        if (cached) return cached;
      }
      throw err;
    }
  },

  async update(input: UpdateGoalsInput): Promise<UserGoals> {
    try {
      const data = await apiClient.put<GoalsResponse>("/goals", input);
      const parsed = userGoalsSchema.parse(data.goals);
      await db.goals.put(parsed);
      return parsed;
    } catch (err) {
      if (err instanceof NetworkError) {
        const cached = await db.goals.toCollection().first();
        if (cached) {
          const merged: UserGoals = {
            ...cached,
            ...(input.weeklyWorkoutGoal !== undefined && {
              weeklyWorkoutGoal: input.weeklyWorkoutGoal,
            }),
            ...(input.targetDays !== undefined && {
              targetDays: input.targetDays,
            }),
          };
          await db.goals.put(merged);
          await enqueueOutbox({
            resource: "goals",
            operation: "update",
            entityId: cached.id,
            endpoint: "/goals",
            method: "PUT",
            payload: input,
          });
          return merged;
        }
      }
      throw err;
    }
  },

  async weekProgress(): Promise<WeeklyProgress> {
    const data = await apiClient.get<ProgressResponse>("/goals/week-progress");
    return weeklyProgressSchema.parse(data.progress);
  },

  async weeklyGoalHistory(): Promise<WeeklyGoalEntry[]> {
    const data = await apiClient.get<HistoryResponse>("/goals/weekly-history");
    return historySchema.parse(data.history);
  },
};
