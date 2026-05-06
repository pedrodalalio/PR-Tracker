import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { goalsApi, type UpdateGoalsInput } from "@/services/goals-api";

const keys = {
  all: ["goals"] as const,
  base: () => [...keys.all, "base"] as const,
  weekProgress: () => [...keys.all, "week-progress"] as const,
  streak: () => [...keys.all, "streak"] as const,
};

export function useGoals() {
  return useQuery({ queryKey: keys.base(), queryFn: () => goalsApi.get() });
}

export function useWeekProgress() {
  return useQuery({
    queryKey: keys.weekProgress(),
    queryFn: () => goalsApi.weekProgress(),
  });
}

export function useStreak() {
  return useQuery({
    queryKey: keys.streak(),
    queryFn: () => goalsApi.streak(),
  });
}

export function useUpdateGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateGoalsInput) => goalsApi.update(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export const goalKeys = keys;
