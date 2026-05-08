import { z } from "zod";
import { apiClient } from "@/lib/api-client";
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

export const goalsApi = {
  async get(): Promise<UserGoals> {
    const data = await apiClient.get<UserGoals>("/goals");
    return userGoalsSchema.parse(data);
  },

  async update(input: UpdateGoalsInput): Promise<UserGoals> {
    const data = await apiClient.put<UserGoals>("/goals", input);
    return userGoalsSchema.parse(data);
  },

  async weekProgress(): Promise<WeeklyProgress> {
    const data = await apiClient.get<WeeklyProgress>("/goals/week-progress");
    return weeklyProgressSchema.parse(data);
  },

  async weeklyGoalHistory(): Promise<WeeklyGoalEntry[]> {
    const data = await apiClient.get<WeeklyGoalEntry[]>(
      "/goals/weekly-history",
    );
    return z.array(weeklyGoalEntrySchema).parse(data);
  },
};
