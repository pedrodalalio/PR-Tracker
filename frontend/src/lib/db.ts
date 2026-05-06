import Dexie, { type EntityTable } from "dexie";
import type { Exercise, UserGoals, Workout } from "@/lib/types";

export type OutboxOperation = "create" | "update" | "delete";
export type OutboxResource =
  | "workout"
  | "workoutExercise"
  | "exercise"
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

export interface CachedWorkout extends Workout {
  /** True while this workout is awaiting server sync. */
  pending?: boolean;
}

export interface CachedExercise extends Exercise {
  pending?: boolean;
}

class PrTrackerDb extends Dexie {
  workouts!: EntityTable<CachedWorkout, "id">;
  exercises!: EntityTable<CachedExercise, "id">;
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
  }
}

export const db = new PrTrackerDb();
