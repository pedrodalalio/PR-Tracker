import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { exercisesApi } from "@/services/exercises-api";
import type { CreateExerciseInput } from "@/lib/types";

const keys = {
  all: ["exercises"] as const,
  list: () => [...keys.all, "list"] as const,
};

export function useExercises() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: () => exercisesApi.list(),
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateExerciseInput) => exercisesApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateExercise(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateExerciseInput>) =>
      exercisesApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => exercisesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export const exerciseKeys = keys;
