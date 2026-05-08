import { z } from "zod";
import { apiClient } from "@/lib/api-client";
import {
  runSchema,
  type Run,
  type RoutePoint,
  type Split,
} from "@/lib/types";

export interface CreateRunInput {
  name?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  distance: number;
  duration: number;
  movingTime?: number;
  pace?: number;
  elevationGain?: number;
  notes?: string;
  source?: string;
  externalId?: string;
  routePoints?: RoutePoint[];
  splits?: Split[];
}

export interface UpdateRunInput {
  name?: string | null;
  date?: string;
  startTime?: string | null;
  endTime?: string | null;
  distance?: number;
  duration?: number;
  movingTime?: number | null;
  pace?: number;
  elevationGain?: number | null;
  notes?: string | null;
  routePoints?: RoutePoint[] | null;
  splits?: Split[] | null;
}

const listSchema = z.array(runSchema);

export const runsApi = {
  async list(): Promise<Run[]> {
    const data = await apiClient.get<Run[]>("/runs");
    return listSchema.parse(data);
  },

  async get(id: string): Promise<Run> {
    const data = await apiClient.get<Run>(`/runs/${id}`);
    return runSchema.parse(data);
  },

  async create(input: CreateRunInput): Promise<Run> {
    const data = await apiClient.post<Run>("/runs", input);
    return runSchema.parse(data);
  },

  async update(id: string, input: UpdateRunInput): Promise<Run> {
    const data = await apiClient.put<Run>(`/runs/${id}`, input);
    return runSchema.parse(data);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete<void>(`/runs/${id}`);
  },
};
