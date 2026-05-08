import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { stravaApi } from "@/services/strava-api";

const keys = {
  all: ["strava"] as const,
  status: () => [...keys.all, "status"] as const,
  activities: (page: number) => [...keys.all, "activities", page] as const,
};

export function useStravaStatus() {
  return useQuery({
    queryKey: keys.status(),
    queryFn: () => stravaApi.status(),
    staleTime: 60_000,
  });
}

export function useStravaActivities(page: number, enabled: boolean) {
  return useQuery({
    queryKey: keys.activities(page),
    queryFn: () => stravaApi.listActivities(page),
    enabled,
    staleTime: 30_000,
  });
}

export function useStravaAuthorize() {
  return useMutation({ mutationFn: () => stravaApi.authorize() });
}

export function useStravaDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => stravaApi.disconnect(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
    },
  });
}

export function useStravaImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => stravaApi.importActivity(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.all });
      qc.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}
