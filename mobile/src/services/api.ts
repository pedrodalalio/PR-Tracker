import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  StreakInfo
} from '../types/workout';
import { MockDataService } from './mockDataService';

const API_BASE_URL = 'http://localhost:3000/api';
const AUTH_STORAGE_KEY = '@pr_tracker_auth';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

async function isGuestUser(): Promise<boolean> {
  try {
    const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (storedAuth) {
      const authData = JSON.parse(storedAuth);
      return authData.type === 'guest';
    }
  } catch (error) {
    console.error('Error checking user type:', error);
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
    const response = await api.get('/workouts');
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
    const response = await api.post('/workouts', workout);
    return response.data.workout;
  },

  // Update workout
  updateWorkout: async (id: string, updates: UpdateWorkoutRequest): Promise<Workout> => {
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
  addExerciseToWorkout: async (workoutId: string, exerciseId: string, sets: any[] = []): Promise<any> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.addExerciseToWorkout(workoutId, exerciseId, sets);
    }
    const response = await api.post(`/workouts/${workoutId}/exercises`, {
      exerciseId,
      sets
    });
    return response.data.workoutExercise;
  }
};

export const exerciseApi = {
  // Get all exercises
  getExercises: async (): Promise<Exercise[]> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.getExercises();
    }
    const response = await api.get('/exercises');
    return response.data.exercises;
  },

  // Get exercise by ID
  getExercise: async (id: string): Promise<Exercise> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.getExercise(id);
    }
    const response = await api.get(`/exercises/${id}`);
    return response.data.exercise;
  },

  // Get exercises by category
  getExercisesByCategory: async (category: string): Promise<Exercise[]> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.getExercisesByCategory(category);
    }
    const response = await api.get(`/exercises/category/${category}`);
    return response.data.exercises;
  },

  // Search exercises by muscle group
  searchExercises: async (muscle?: string): Promise<Exercise[]> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.searchExercises(muscle);
    }
    const response = await api.get('/exercises/search', {
      params: muscle ? { muscle } : {}
    });
    return response.data.exercises;
  },

  // Create new exercise
  createExercise: async (exercise: CreateExerciseRequest): Promise<Exercise> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.createExercise(exercise);
    }
    const response = await api.post('/exercises', exercise);
    return response.data.exercise;
  },

  // Update exercise
  updateExercise: async (id: string, updates: Partial<CreateExerciseRequest>): Promise<Exercise> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.updateExercise(id, updates);
    }
    const response = await api.put(`/exercises/${id}`, updates);
    return response.data.exercise;
  },

  // Delete exercise
  deleteExercise: async (id: string): Promise<void> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.deleteExercise(id);
    }
    await api.delete(`/exercises/${id}`);
  }
};

export const goalsApi = {
  // Get user goals
  getGoals: async (): Promise<UserGoals> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.getGoals();
    }
    try {
      const response = await api.get('/goals');
      console.log('Goals API response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Get goals error:', error);
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
      console.log('Updating goals with:', updates);
      const response = await api.put('/goals', updates);
      console.log('Update goals response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Update goals error:', error);
      throw error;
    }
  },

  // Get current week progress
  getWeekProgress: async (): Promise<WeeklyProgress> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.getWeekProgress();
    }
    const response = await api.get('/goals/week-progress');
    return response.data;
  },

  // Get streak information
  getStreakInfo: async (): Promise<StreakInfo> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.getStreakInfo();
    }
    const response = await api.get('/goals/streak-info');
    return response.data;
  },

  // Manually update streak (called after workout)
  updateStreak: async (): Promise<UserGoals> => {
    if (await isGuestUser()) {
      const mockService = await getMockService();
      return mockService.updateStreak();
    }
    const response = await api.post('/goals/update-streak');
    return response.data;
  }
};

export default api;