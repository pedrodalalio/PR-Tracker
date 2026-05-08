import { z } from "zod";

export const weekDaySchema = z.enum([
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
]);
export type WeekDay = z.infer<typeof weekDaySchema>;

export const workoutTypeSchema = z.enum(["upper", "lower", "cardio"]);
export type WorkoutType = z.infer<typeof workoutTypeSchema>;

export const categorySchema = z.enum(["Upper", "Lower", "Cardio"]);
export type Category = z.infer<typeof categorySchema>;

export const exerciseMuscleGroupSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  muscleGroup: z.string(),
});

export const exerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: categorySchema,
  muscleGroups: z.array(exerciseMuscleGroupSchema).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Exercise = z.infer<typeof exerciseSchema>;

export const setSchema = z.object({
  id: z.string(),
  workoutExerciseId: z.string(),
  reps: z.number().int().nonnegative(),
  weight: z.number().nonnegative(),
  duration: z.number().int().nullable().optional(),
  distance: z.number().nullable().optional(),
  pace: z.number().nullable().optional(),
});
export type WorkoutSet = z.infer<typeof setSchema>;

export const workoutExerciseSchema = z.object({
  id: z.string(),
  exerciseId: z.string(),
  workoutId: z.string(),
  notes: z.string().nullable().optional(),
  exercise: exerciseSchema,
  sets: z.array(setSchema).default([]),
});
export type WorkoutExercise = z.infer<typeof workoutExerciseSchema>;

export const workoutSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  date: z.string(),
  workoutType: workoutTypeSchema,
  dayOfWeek: weekDaySchema,
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  exercises: z.array(workoutExerciseSchema).default([]),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Workout = z.infer<typeof workoutSchema>;

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string().email(),
  createdAt: z.string().optional(),
});
export type User = z.infer<typeof userSchema>;

export const userGoalsSchema = z.object({
  id: z.string(),
  userId: z.string().optional(),
  weeklyWorkoutGoal: z.number().int().positive(),
  targetDays: z.array(weekDaySchema).default([]),
  currentStreak: z.number().int().nonnegative(),
  bestStreak: z.number().int().nonnegative(),
  totalWeeksCompleted: z.number().int().nonnegative(),
  lastWorkoutDate: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type UserGoals = z.infer<typeof userGoalsSchema>;

export const weeklyProgressSchema = z.object({
  weekStartDate: z.string(),
  weekEndDate: z.string(),
  targetWorkouts: z.number().int().positive(),
  completedWorkouts: z.number().int().nonnegative(),
  isCompleted: z.boolean(),
});
export type WeeklyProgress = z.infer<typeof weeklyProgressSchema>;

export function weeklyProgressPercent(p: WeeklyProgress): number {
  if (p.targetWorkouts <= 0) return 0;
  return Math.min(100, (p.completedWorkouts / p.targetWorkouts) * 100);
}

export const weeklyGoalEntrySchema = z.object({
  id: z.string(),
  weeklyWorkoutGoal: z.number().int().positive(),
  effectiveFrom: z.string(),
  createdAt: z.string().optional(),
});
export type WeeklyGoalEntry = z.infer<typeof weeklyGoalEntrySchema>;

export const routePointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  ele: z.number().optional(),
  t: z.number().optional(),
});
export type RoutePoint = z.infer<typeof routePointSchema>;

export const splitSchema = z.object({
  km: z.number(),
  duration: z.number(),
  pace: z.number(),
});
export type Split = z.infer<typeof splitSchema>;

export const runSchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  date: z.string(),
  startTime: z.string().nullable().optional(),
  endTime: z.string().nullable().optional(),
  distance: z.number().positive(), // metros
  duration: z.number().int().positive(), // segundos (elapsed)
  movingTime: z.number().int().nullable().optional(), // segundos (excluindo paradas)
  pace: z.number().nullable().optional(), // seg/km (baseado em movingTime quando disponível)
  elevationGain: z.number().nullable().optional(), // metros
  notes: z.string().nullable().optional(),
  source: z.string(),
  externalId: z.string().nullable().optional(),
  routePoints: z.array(routePointSchema).nullable().optional(),
  splits: z.array(splitSchema).nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type Run = z.infer<typeof runSchema>;

export const weightEntrySchema = z.object({
  id: z.string(),
  weight: z.number().positive(),
  recordedAt: z.string(),
  notes: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type WeightEntry = z.infer<typeof weightEntrySchema>;

export interface CreateWorkoutInput {
  name: string;
  date: string;
  workoutType: WorkoutType;
  dayOfWeek: WeekDay;
  notes?: string;
  exercises?: Array<{
    exerciseId: string;
    notes?: string;
    sets?: Array<{
      reps: number;
      weight: number;
      duration?: number;
      distance?: number;
      pace?: number;
    }>;
  }>;
}

export interface UpdateWorkoutInput {
  name?: string;
  date?: string;
  workoutType?: WorkoutType;
  dayOfWeek?: WeekDay;
  notes?: string;
  endTime?: string | null;
  exercises?: CreateWorkoutInput["exercises"];
}

export interface CreateExerciseInput {
  name: string;
  category: Category;
  muscleGroups: string[];
}
