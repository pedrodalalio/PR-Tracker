import { z } from "zod";
import { apiClient, NetworkError } from "@/lib/api-client";
import { db, type CachedRun } from "@/lib/db";
import { enqueueOutbox } from "@/lib/sync";
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

interface RunsResponse {
  runs: Run[];
}
interface RunResponse {
  run: Run;
}

const listSchema = z.array(runSchema);

function localId() {
  return `local_${crypto.randomUUID()}`;
}

export const runsApi = {
  async list(): Promise<Run[]> {
    try {
      const data = await apiClient.get<RunsResponse>("/runs");
      const parsed = listSchema.parse(data.runs);
      await db.runs.bulkPut(parsed);
      return parsed;
    } catch (err) {
      if (err instanceof NetworkError) {
        return db.runs.orderBy("date").reverse().toArray();
      }
      throw err;
    }
  },

  async get(id: string): Promise<Run> {
    try {
      const data = await apiClient.get<RunResponse>(`/runs/${id}`);
      const parsed = runSchema.parse(data.run);
      await db.runs.put(parsed);
      return parsed;
    } catch (err) {
      if (err instanceof NetworkError) {
        const cached = await db.runs.get(id);
        if (cached) return cached;
      }
      throw err;
    }
  },

  async create(input: CreateRunInput): Promise<Run> {
    try {
      const data = await apiClient.post<RunResponse>("/runs", input);
      const parsed = runSchema.parse(data.run);
      await db.runs.put(parsed);
      return parsed;
    } catch (err) {
      if (err instanceof NetworkError) {
        const optimistic: Run = {
          id: localId(),
          name: input.name ?? null,
          date: input.date,
          startTime: input.startTime ?? null,
          endTime: input.endTime ?? null,
          distance: input.distance,
          duration: input.duration,
          movingTime: input.movingTime ?? null,
          pace: input.pace ?? null,
          elevationGain: input.elevationGain ?? null,
          notes: input.notes ?? null,
          source: input.source ?? "manual",
          externalId: input.externalId ?? null,
          routePoints: input.routePoints ?? null,
          splits: input.splits ?? null,
        };
        await db.runs.put(optimistic);
        await enqueueOutbox({
          resource: "run",
          operation: "create",
          entityId: optimistic.id,
          endpoint: "/runs",
          method: "POST",
          payload: input,
        });
        return optimistic;
      }
      throw err;
    }
  },

  async update(id: string, input: UpdateRunInput): Promise<Run> {
    try {
      const data = await apiClient.put<RunResponse>(`/runs/${id}`, input);
      const parsed = runSchema.parse(data.run);
      await db.runs.put(parsed);
      return parsed;
    } catch (err) {
      if (err instanceof NetworkError) {
        const cached = await db.runs.get(id);
        if (cached) {
          const merged: CachedRun = { ...cached, ...input } as CachedRun;
          await db.runs.put(merged);
          await enqueueOutbox({
            resource: "run",
            operation: "update",
            entityId: id,
            endpoint: `/runs/${id}`,
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
      await apiClient.delete<void>(`/runs/${id}`);
      await db.runs.delete(id);
    } catch (err) {
      if (err instanceof NetworkError) {
        await db.runs.delete(id);
        await enqueueOutbox({
          resource: "run",
          operation: "delete",
          entityId: id,
          endpoint: `/runs/${id}`,
          method: "DELETE",
        });
        return;
      }
      throw err;
    }
  },
};
