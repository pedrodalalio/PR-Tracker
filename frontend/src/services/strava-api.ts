import { apiClient } from "@/lib/api-client";
import { runSchema, type Run } from "@/lib/types";

export interface StravaStatus {
  connected: boolean;
  athleteId: number | null;
  scope: string | null;
  connectedAt: string | null;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  sportType: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  elevationGain: number;
  startDate: string;
  startDateLocal: string;
  averageSpeed: number;
  averageHeartrate: number | null;
  imported: boolean;
  importedRunId: string | null;
}

export const stravaApi = {
  async status(): Promise<StravaStatus> {
    return apiClient.get<StravaStatus>("/strava/status");
  },

  async authorize(): Promise<{ url: string }> {
    return apiClient.post<{ url: string }>("/strava/authorize", {});
  },

  async disconnect(): Promise<void> {
    await apiClient.post<{ ok: boolean }>("/strava/disconnect", {});
  },

  async listActivities(page: number, perPage = 30): Promise<StravaActivity[]> {
    return apiClient.get<StravaActivity[]>(
      `/strava/activities?page=${page}&perPage=${perPage}`,
    );
  },

  async importActivity(
    id: number,
  ): Promise<{ run: Run; alreadyImported: boolean }> {
    const data = await apiClient.post<{ run: unknown; alreadyImported: boolean }>(
      "/strava/import",
      { id },
    );
    return {
      run: runSchema.parse(data.run),
      alreadyImported: data.alreadyImported,
    };
  },
};
