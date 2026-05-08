import Dexie, { type EntityTable } from "dexie";
import type {
  Exercise,
  Run,
  UserGoals,
  WeightEntry,
  Workout,
} from "@/lib/types";

export type OutboxOperation = "create" | "update" | "delete";
export type OutboxResource =
  | "workout"
  | "workoutExercise"
  | "exercise"
  | "run"
  | "weight"
  | "goals";

export interface OutboxEntry {
  id?: number;
  resource: OutboxResource;
  operation: OutboxOperation;
  /** Local entity id, when applicable. */
  entityId?: string;
  /** Server endpoint to call (relative path). */
  endpoint: string;
  method: "POST" | "PUT" | "DELETE";
  payload?: unknown;
  retries: number;
  error?: string;
  createdAt: number;
}

export type CachedWorkout = Workout;
export type CachedExercise = Exercise;
export type CachedRun = Run;
export type CachedWeight = WeightEntry;

class PrTrackerDb extends Dexie {
  workouts!: EntityTable<CachedWorkout, "id">;
  exercises!: EntityTable<CachedExercise, "id">;
  runs!: EntityTable<CachedRun, "id">;
  weights!: EntityTable<CachedWeight, "id">;
  goals!: EntityTable<UserGoals, "id">;
  outbox!: EntityTable<OutboxEntry, "id">;

  constructor() {
    super("pr-tracker");
    this.version(1).stores({
      workouts: "id, userId, date, workoutType",
      exercises: "id, name, category",
      goals: "id, userId",
      outbox: "++id, resource, createdAt",
    });
    this.version(2).stores({
      workouts: "id, userId, date, workoutType",
      exercises: "id, name, category",
      runs: "id, date, source",
      weights: "id, recordedAt",
      goals: "id, userId",
      outbox: "++id, resource, createdAt",
    });
  }
}

export const db = new PrTrackerDb();
