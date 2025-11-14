import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Workout,
  Exercise,
  CreateWorkoutRequest,
  UpdateWorkoutRequest,
  CreateExerciseRequest,
  UserGoals,
  CreateGoalsRequest,
  UpdateGoalsRequest,
  WeeklyProgress,
  StreakInfo,
} from "../types/workout";
import { MockDataService } from "./mockDataService";
import { ENV_CONFIG } from "../config/environment";
import { ToastService } from "./toastService";
import {
  mapCategoryToBackend,
  mapCategoryToFrontend,
  mapWorkoutTypeToBackend,
  mapWorkoutTypeToFrontend,
  type FrontendCategory,
  type BackendCategory
} from "../utils/categoryMapping";

const AUTH_STORAGE_KEY = "@pr_tracker_auth";

const api = axios.create({
  baseURL: ENV_CONFIG.apiBaseUrl,
  timeout: 10000,
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem("@pr_tracker_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn("Failed to get auth token:", error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only show toast for non-guest users and if error is not from auth endpoints
    const isAuthError = error?.config?.url?.includes('/auth/');

    if (!isAuthError) {
      ToastService.handleApiError(error);
    }

    return Promise.reject(error);
  }
);

async function isGuestUser(): Promise<boolean> {
  try {
    const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (storedAuth) {
      const authData = JSON.parse(storedAuth);
      return authData.type === "guest";
    }
  } catch (error) {
    console.error("Error checking user type:", error);
  }
  return false;
}

async function getMockService() {
  return MockDataService.getInstance();
}

export const workoutApi = {
  // Get all workouts
  getWorkouts: async (): Promise<Workout[]> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.getWorkouts();
    }
    const response = await api.get("/workouts");
    return response.data.workouts;
  },

  // Get workout by ID
  getWorkout: async (id: string): Promise<Workout> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.getWorkout(id);
    }
    const response = await api.get(`/workouts/${id}`);
    return response.data.workout;
  },

  // Create new workout
  createWorkout: async (workout: CreateWorkoutRequest): Promise<Workout> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.createWorkout(workout);
    }
    const response = await api.post("/workouts", workout);
    return response.data.workout;
  },

  // Update workout
  updateWorkout: async (
    id: string,
    updates: UpdateWorkoutRequest,
  ): Promise<Workout> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.updateWorkout(id, updates);
    }
    const response = await api.put(`/workouts/${id}`, updates);
    return response.data.workout;
  },

  // Delete workout
  deleteWorkout: async (id: string): Promise<void> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.deleteWorkout(id);
    }
    await api.delete(`/workouts/${id}`);
  },

  // Add exercise to workout
  addExerciseToWorkout: async (
    workoutId: string,
    exerciseId: string,
    sets: any[] = [],
  ): Promise<any> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.addExerciseToWorkout(workoutId, exerciseId, sets);
    }
    const response = await api.post(`/workouts/${workoutId}/exercises`, {
      exerciseId,
      sets,
    });
    return response.data.workoutExercise;
  },
};

export const exerciseApi = {
  // Get all exercises
  getExercises: async (): Promise<Exercise[]> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.getExercises();
    }
    const response = await api.get("/exercises");

    // Mapear categorias de volta para português e transformar muscleGroups
    const exercises = response.data.exercises.map((exercise: any) => ({
      ...exercise,
      category: mapCategoryToFrontend(exercise.category as BackendCategory),
      muscleGroups: exercise.muscleGroups.map((mg: any) => mg.muscleGroup)
    }));

    return exercises;
  },

  // Get exercise by ID
  getExercise: async (id: string): Promise<Exercise> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.getExercise(id);
    }
    const response = await api.get(`/exercises/${id}`);

    // Mapear categoria de volta para português e transformar muscleGroups
    const exercise = {
      ...response.data.exercise,
      category: mapCategoryToFrontend(response.data.exercise.category as BackendCategory),
      muscleGroups: response.data.exercise.muscleGroups.map((mg: any) => mg.muscleGroup)
    };

    return exercise;
  },

  // Get exercises by category
  getExercisesByCategory: async (category: string): Promise<Exercise[]> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.getExercisesByCategory(category);
    }

    // Mapear categoria para inglês antes de enviar
    const backendCategory = mapCategoryToBackend(category as FrontendCategory);
    const response = await api.get(`/exercises/category/${backendCategory}`);

    // Mapear categorias de volta para português e transformar muscleGroups
    const exercises = response.data.exercises.map((exercise: any) => ({
      ...exercise,
      category: mapCategoryToFrontend(exercise.category as BackendCategory),
      muscleGroups: exercise.muscleGroups.map((mg: any) => mg.muscleGroup)
    }));

    return exercises;
  },

  // Search exercises by muscle group
  searchExercises: async (muscle?: string): Promise<Exercise[]> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.searchExercises(muscle);
    }
    const response = await api.get("/exercises/search", {
      params: muscle ? { muscle } : {},
    });

    // Mapear categorias de volta para português e transformar muscleGroups
    const exercises = response.data.exercises.map((exercise: any) => ({
      ...exercise,
      category: mapCategoryToFrontend(exercise.category as BackendCategory),
      muscleGroups: exercise.muscleGroups.map((mg: any) => mg.muscleGroup)
    }));

    return exercises;
  },

  // Create new exercise
  createExercise: async (
    exercise: CreateExerciseRequest,
  ): Promise<Exercise> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.createExercise(exercise);
    }

    // Mapear categoria para inglês antes de enviar ao backend
    const exerciseData = {
      ...exercise,
      category: mapCategoryToBackend(exercise.category as FrontendCategory)
    };

    const response = await api.post("/exercises", exerciseData);

    // Mapear categoria de volta para português na resposta e transformar muscleGroups
    const exerciseResponse = {
      ...response.data.exercise,
      category: mapCategoryToFrontend(response.data.exercise.category as BackendCategory),
      muscleGroups: response.data.exercise.muscleGroups.map((mg: any) => mg.muscleGroup)
    };

    return exerciseResponse;
  },

  // Update exercise
  updateExercise: async (
    id: string,
    updates: Partial<CreateExerciseRequest>,
  ): Promise<Exercise> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.updateExercise(id, updates);
    }

    // Mapear categoria para inglês antes de enviar ao backend
    const updatedData = {
      ...updates,
      ...(updates.category && {
        category: mapCategoryToBackend(updates.category as FrontendCategory)
      })
    };

    const response = await api.put(`/exercises/${id}`, updatedData);

    // Mapear categoria de volta para português na resposta e transformar muscleGroups
    const exerciseResponse = {
      ...response.data.exercise,
      category: mapCategoryToFrontend(response.data.exercise.category as BackendCategory),
      muscleGroups: response.data.exercise.muscleGroups.map((mg: any) => mg.muscleGroup)
    };

    return exerciseResponse;
  },

  // Delete exercise
  deleteExercise: async (id: string): Promise<void> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.deleteExercise(id);
    }
    await api.delete(`/exercises/${id}`);
  },
};

export const goalsApi = {
  // Get user goals
  getGoals: async (): Promise<UserGoals> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.getGoals();
    }
    try {
      const response = await api.get("/goals");
      return response.data;
    } catch (error) {
      console.error("Get goals error:", error);
      throw error;
    }
  },

  // Update user goals
  updateGoals: async (updates: UpdateGoalsRequest): Promise<UserGoals> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.updateGoals(updates);
    }
    try {
      const response = await api.put("/goals", updates);
      return response.data;
    } catch (error) {
      console.error("Update goals error:", error);
      throw error;
    }
  },

  // Get current week progress
  getWeekProgress: async (): Promise<WeeklyProgress> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.getWeekProgress();
    }
    const response = await api.get("/goals/week-progress");
    return response.data;
  },

  // Get streak information
  getStreakInfo: async (): Promise<StreakInfo> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.getStreakInfo();
    }
    const response = await api.get("/goals/streak-info");
    return response.data;
  },

  // Manually update streak (called after workout)
  updateStreak: async (): Promise<UserGoals> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.updateStreak();
    }
    const response = await api.post("/goals/update-streak");
    return response.data;
  },
};

export default api;
