import { apiClient } from "@/lib/api-client";
import {
  workoutTemplateSchema,
  type CreateWorkoutTemplateInput,
  type UpdateWorkoutTemplateInput,
  type WorkoutTemplate,
} from "@/lib/types";

interface TemplatesResponse {
  templates: WorkoutTemplate[];
}
interface TemplateResponse {
  template: WorkoutTemplate;
}

export const workoutTemplatesApi = {
  async list(): Promise<WorkoutTemplate[]> {
    const data = await apiClient.get<TemplatesResponse>("/workout-templates");
    return data.templates.map((t) => workoutTemplateSchema.parse(t));
  },

  async get(id: string): Promise<WorkoutTemplate> {
    const data = await apiClient.get<TemplateResponse>(
      `/workout-templates/${id}`,
    );
    return workoutTemplateSchema.parse(data.template);
  },

  async create(input: CreateWorkoutTemplateInput): Promise<WorkoutTemplate> {
    const data = await apiClient.post<TemplateResponse>(
      "/workout-templates",
      input,
    );
    return workoutTemplateSchema.parse(data.template);
  },

  async update(
    id: string,
    input: UpdateWorkoutTemplateInput,
  ): Promise<WorkoutTemplate> {
    const data = await apiClient.put<TemplateResponse>(
      `/workout-templates/${id}`,
      input,
    );
    return workoutTemplateSchema.parse(data.template);
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete<void>(`/workout-templates/${id}`);
  },
};
