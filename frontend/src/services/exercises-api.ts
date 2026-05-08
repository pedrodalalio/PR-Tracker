import { apiClient, NetworkError } from "@/lib/api-client";
import { db, type CachedExercise } from "@/lib/db";
import { enqueueOutbox } from "@/lib/sync";
import {
  exerciseSchema,
  type CreateExerciseInput,
  type Exercise,
} from "@/lib/types";

interface ExercisesResponse {
  exercises: Exercise[];
}
interface ExerciseResponse {
  exercise: Exercise;
}

function localId() {
  return `local_${crypto.randomUUID()}`;
}

export const exercisesApi = {
  async list(): Promise<Exercise[]> {
    try {
      const data = await apiClient.get<ExercisesResponse>("/exercises");
      const parsed = data.exercises.map((e) => exerciseSchema.parse(e));
      await db.exercises.bulkPut(parsed);
      return parsed;
    } catch (err) {
      if (err instanceof NetworkError) {
        return db.exercises.orderBy("name").toArray();
      }
      throw err;
    }
  },

  async create(input: CreateExerciseInput): Promise<Exercise> {
    try {
      const data = await apiClient.post<ExerciseResponse>("/exercises", input);
      const parsed = exerciseSchema.parse(data.exercise);
      await db.exercises.put(parsed);
      return parsed;
    } catch (err) {
      if (err instanceof NetworkError) {
        const optimistic: Exercise = {
          id: localId(),
          name: input.name,
          category: input.category,
          muscleGroups: input.muscleGroups.map((mg) => ({
            id: localId(),
            exerciseId: "local",
            muscleGroup: mg,
          })),
        };
        await db.exercises.put(optimistic);
        await enqueueOutbox({
          resource: "exercise",
          operation: "create",
          entityId: optimistic.id,
          endpoint: "/exercises",
          method: "POST",
          payload: input,
        });
        return optimistic;
      }
      throw err;
    }
  },

  async update(
    id: string,
    input: Partial<CreateExerciseInput>,
  ): Promise<Exercise> {
    try {
      const data = await apiClient.put<ExerciseResponse>(
        `/exercises/${id}`,
        input,
      );
      const parsed = exerciseSchema.parse(data.exercise);
      await db.exercises.put(parsed);
      return parsed;
    } catch (err) {
      if (err instanceof NetworkError) {
        const cached = await db.exercises.get(id);
        if (cached) {
          const merged: CachedExercise = {
            ...cached,
            ...(input.name !== undefined && { name: input.name }),
            ...(input.category !== undefined && { category: input.category }),
            ...(input.muscleGroups !== undefined && {
              muscleGroups: input.muscleGroups.map((mg) => ({
                id: localId(),
                exerciseId: id,
                muscleGroup: mg,
              })),
            }),
          };
          await db.exercises.put(merged);
          await enqueueOutbox({
            resource: "exercise",
            operation: "update",
            entityId: id,
            endpoint: `/exercises/${id}`,
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
      await apiClient.delete<void>(`/exercises/${id}`);
      await db.exercises.delete(id);
    } catch (err) {
      if (err instanceof NetworkError) {
        await db.exercises.delete(id);
        await enqueueOutbox({
          resource: "exercise",
          operation: "delete",
          entityId: id,
          endpoint: `/exercises/${id}`,
          method: "DELETE",
        });
        return;
      }
      throw err;
    }
  },
};
