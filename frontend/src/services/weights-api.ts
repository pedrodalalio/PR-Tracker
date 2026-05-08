import { z } from "zod";
import { apiClient, NetworkError } from "@/lib/api-client";
import { db, type CachedWeight } from "@/lib/db";
import { enqueueOutbox } from "@/lib/sync";
import { weightEntrySchema, type WeightEntry } from "@/lib/types";

export interface CreateWeightInput {
  weight: number;
  recordedAt?: string;
  notes?: string;
}

export interface UpdateWeightInput {
  weight?: number;
  recordedAt?: string;
  notes?: string | null;
}

interface WeightsResponse {
  weights: WeightEntry[];
}
interface WeightResponse {
  weight: WeightEntry;
}

const listSchema = z.array(weightEntrySchema);

function localId() {
  return `local_${crypto.randomUUID()}`;
}

export const weightsApi = {
  async list(): Promise<WeightEntry[]> {
    try {
      const data = await apiClient.get<WeightsResponse>("/weights");
      const parsed = listSchema.parse(data.weights);
      await db.weights.bulkPut(parsed);
      return parsed;
    } catch (err) {
      if (err instanceof NetworkError) {
        return db.weights.orderBy("recordedAt").reverse().toArray();
      }
      throw err;
    }
  },

  async create(input: CreateWeightInput): Promise<WeightEntry> {
    try {
      const data = await apiClient.post<WeightResponse>("/weights", input);
      const parsed = weightEntrySchema.parse(data.weight);
      await db.weights.put(parsed);
      return parsed;
    } catch (err) {
      if (err instanceof NetworkError) {
        const optimistic: WeightEntry = {
          id: localId(),
          weight: input.weight,
          recordedAt: input.recordedAt ?? new Date().toISOString(),
          notes: input.notes ?? null,
        };
        await db.weights.put(optimistic);
        await enqueueOutbox({
          resource: "weight",
          operation: "create",
          entityId: optimistic.id,
          endpoint: "/weights",
          method: "POST",
          payload: input,
        });
        return optimistic;
      }
      throw err;
    }
  },

  async update(id: string, input: UpdateWeightInput): Promise<WeightEntry> {
    try {
      const data = await apiClient.put<WeightResponse>(
        `/weights/${id}`,
        input,
      );
      const parsed = weightEntrySchema.parse(data.weight);
      await db.weights.put(parsed);
      return parsed;
    } catch (err) {
      if (err instanceof NetworkError) {
        const cached = await db.weights.get(id);
        if (cached) {
          const merged: CachedWeight = { ...cached, ...input } as CachedWeight;
          await db.weights.put(merged);
          await enqueueOutbox({
            resource: "weight",
            operation: "update",
            entityId: id,
            endpoint: `/weights/${id}`,
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
      await apiClient.delete<void>(`/weights/${id}`);
      await db.weights.delete(id);
    } catch (err) {
      if (err instanceof NetworkError) {
        await db.weights.delete(id);
        await enqueueOutbox({
          resource: "weight",
          operation: "delete",
          entityId: id,
          endpoint: `/weights/${id}`,
          method: "DELETE",
        });
        return;
      }
      throw err;
    }
  },
};
