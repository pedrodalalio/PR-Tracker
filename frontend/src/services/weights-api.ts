import { apiClient } from "@/lib/api-client";
import { weightEntrySchema, type WeightEntry } from "@/lib/types";
import { z } from "zod";

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

const listSchema = z.array(weightEntrySchema);

export const weightsApi = {
  async list(): Promise<WeightEntry[]> {
    const data = await apiClient.get<WeightEntry[]>("/weights");
    return listSchema.parse(data);
  },

  async create(input: CreateWeightInput): Promise<WeightEntry> {
    const data = await apiClient.post<WeightEntry>("/weights", input);
    return weightEntrySchema.parse(data);
  },

  async update(id: string, input: UpdateWeightInput): Promise<WeightEntry> {
    const data = await apiClient.put<WeightEntry>(`/weights/${id}`, input);
    return weightEntrySchema.parse(data);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete<void>(`/weights/${id}`);
  },
};
