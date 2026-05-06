import { apiClient, NetworkError } from "@/lib/api-client";
import { db } from "@/lib/db";
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
    const data = await apiClient.post<ExerciseResponse>("/exercises", input);
    const parsed = exerciseSchema.parse(data.exercise);
    await db.exercises.put(parsed);
    return parsed;
  },

  async update(
    id: string,
    input: Partial<CreateExerciseInput>,
  ): Promise<Exercise> {
    const data = await apiClient.put<ExerciseResponse>(
      `/exercises/${id}`,
      input,
    );
    const parsed = exerciseSchema.parse(data.exercise);
    await db.exercises.put(parsed);
    return parsed;
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete<void>(`/exercises/${id}`);
    await db.exercises.delete(id);
  },
};
