import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { workoutTemplatesApi } from "@/services/workout-templates-api";
import type {
  CreateWorkoutTemplateInput,
  UpdateWorkoutTemplateInput,
} from "@/lib/types";

const keys = {
  all: ["workout-templates"] as const,
  list: () => [...keys.all, "list"] as const,
  detail: (id: string) => [...keys.all, "detail", id] as const,
};

export function useWorkoutTemplates() {
  return useQuery({
    queryKey: keys.list(),
    queryFn: () => workoutTemplatesApi.list(),
  });
}

export function useWorkoutTemplate(id: string | undefined) {
  return useQuery({
    queryKey: id ? keys.detail(id) : ["workout-templates", "detail", "none"],
    queryFn: () => workoutTemplatesApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateWorkoutTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkoutTemplateInput) =>
      workoutTemplatesApi.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useUpdateWorkoutTemplate(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateWorkoutTemplateInput) =>
      workoutTemplatesApi.update(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useDeleteWorkoutTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => workoutTemplatesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.all }),
  });
}

export const workoutTemplateKeys = keys;
