import { apiClient, NetworkError } from "@/lib/api-client";
import { db, type CachedWorkout } from "@/lib/db";
import { enqueueOutbox } from "@/lib/sync";
import {
  workoutSchema,
  type CreateWorkoutInput,
  type UpdateWorkoutInput,
  type Workout,
} from "@/lib/types";

interface WorkoutsResponse {
  workouts: Workout[];
}
interface WorkoutResponse {
  workout: Workout;
}

function localId() {
  return `local_${crypto.randomUUID()}`;
}

export const workoutsApi = {
  async list(): Promise<Workout[]> {
    try {
      const data = await apiClient.get<WorkoutsResponse>("/workouts");
      const parsed = data.workouts.map((w) => workoutSchema.parse(w));
      await db.workouts.bulkPut(parsed);
      return parsed;
    } catch (err) {
      if (err instanceof NetworkError) {
        return db.workouts.orderBy("date").reverse().toArray();
      }
      throw err;
    }
  },

  async get(id: string): Promise<Workout> {
    try {
      const data = await apiClient.get<WorkoutResponse>(`/workouts/${id}`);
      const parsed = workoutSchema.parse(data.workout);
      await db.workouts.put(parsed);
      return parsed;
    } catch (err) {
      if (err instanceof NetworkError) {
        const cached = await db.workouts.get(id);
        if (cached) return cached;
      }
      throw err;
    }
  },

  async create(input: CreateWorkoutInput): Promise<Workout> {
    try {
      const data = await apiClient.post<WorkoutResponse>("/workouts", input);
      const parsed = workoutSchema.parse(data.workout);
      await db.workouts.put(parsed);
      return parsed;
    } catch (err) {
      if (err instanceof NetworkError) {
        const optimistic: Workout = {
          id: localId(),
          userId: "local",
          name: input.name,
          date: input.date,
          workoutType: input.workoutType,
          dayOfWeek: input.dayOfWeek,
          notes: input.notes,
          exercises: [],
          startTime: new Date().toISOString(),
        };
        await db.workouts.put({ ...optimistic, pending: true });
        await enqueueOutbox({
          resource: "workout",
          operation: "create",
          entityId: optimistic.id,
          endpoint: "/workouts",
          method: "POST",
          payload: input,
        });
        return optimistic;
      }
      throw err;
    }
  },

  async update(id: string, input: UpdateWorkoutInput): Promise<Workout> {
    try {
      const data = await apiClient.put<WorkoutResponse>(
        `/workouts/${id}`,
        input,
      );
      const parsed = workoutSchema.parse(data.workout);
      await db.workouts.put(parsed);
      return parsed;
    } catch (err) {
      if (err instanceof NetworkError) {
        const cached = await db.workouts.get(id);
        if (cached) {
          // No cache offline a gente preserva os exercícios atuais — só
          // aplica os campos escalares do patch. O backend vai aplicar a
          // troca completa quando a fila do outbox for liberada.
          const { exercises: _exercises, ...scalarPatch } = input;
          const merged: CachedWorkout = {
            ...cached,
            ...scalarPatch,
            pending: true,
          };
          await db.workouts.put(merged);
          await enqueueOutbox({
            resource: "workout",
            operation: "update",
            entityId: id,
            endpoint: `/workouts/${id}`,
            method: "PUT",
            payload: input,
          });
          return merged;
        }
      }
      throw err;
    }
  },

  async remove(id: string): Promise<void> {
    try {
      await apiClient.delete<void>(`/workouts/${id}`);
      await db.workouts.delete(id);
    } catch (err) {
      if (err instanceof NetworkError) {
        await db.workouts.delete(id);
        await enqueueOutbox({
          resource: "workout",
          operation: "delete",
          entityId: id,
          endpoint: `/workouts/${id}`,
          method: "DELETE",
        });
        return;
      }
      throw err;
    }
  },
};
