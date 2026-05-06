import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { workoutsApi } from "@/services/workouts-api";
import type { CreateWorkoutInput, UpdateWorkoutInput } from "@/lib/types";

const keys = {
  all: ["workouts"] as const,
  list: () => [...keys.all, "list"] as const,
  detail: (id: string) => [...keys.all, "detail", id] as const,
};

export function useWorkouts() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: () => workoutsApi.list(),
  });
}

export function useWorkout(id: string | undefined) {
  return useQuery({
    queryKey: id ? keys.detail(id) : ["workouts", "detail", "none"],
    queryFn: () => workoutsApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkoutInput) => workoutsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useUpdateWorkout(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWorkoutInput) => workoutsApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useDeleteWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workoutsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export const workoutKeys = keys;
