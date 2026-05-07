import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  weightsApi,
  type CreateWeightInput,
  type UpdateWeightInput,
} from "@/services/weights-api";

const keys = {
  all: ["weights"] as const,
  list: () => [...keys.all, "list"] as const,
};

export function useWeights() {
  return useQuery({ queryKey: keys.list(), queryFn: () => weightsApi.list() });
}

export function useCreateWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWeightInput) => weightsApi.create(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useUpdateWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWeightInput }) =>
      weightsApi.update(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useDeleteWeight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => weightsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export const weightKeys = keys;
