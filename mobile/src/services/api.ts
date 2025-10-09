import axios from 'axios';
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

const API_BASE_URL = 'http://10.1.0.168:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const workoutApi = {
  // Get all workouts
  getWorkouts: async (): Promise<Workout[]> => {
    const response = await api.get('/workouts');
    return response.data.workouts;
  },

  // Get workout by ID
  getWorkout: async (id: string): Promise<Workout> => {
    const response = await api.get(`/workouts/${id}`);
    return response.data.workout;
  },

  // Create new workout
  createWorkout: async (workout: CreateWorkoutRequest): Promise<Workout> => {
    const response = await api.post('/workouts', workout);
    return response.data.workout;
  },

  // Update workout
  updateWorkout: async (id: string, updates: UpdateWorkoutRequest): Promise<Workout> => {
    const response = await api.put(`/workouts/${id}`, updates);
    return response.data.workout;
  },

  // Delete workout
  deleteWorkout: async (id: string): Promise<void> => {
    await api.delete(`/workouts/${id}`);
  },

  // Add exercise to workout
  addExerciseToWorkout: async (workoutId: string, exerciseId: string, sets: any[] = []): Promise<any> => {
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
    const response = await api.get('/exercises');
    return response.data.exercises;
  },

  // Get exercise by ID
  getExercise: async (id: string): Promise<Exercise> => {
    const response = await api.get(`/exercises/${id}`);
    return response.data.exercise;
  },

  // Get exercises by category
  getExercisesByCategory: async (category: string): Promise<Exercise[]> => {
    const response = await api.get(`/exercises/category/${category}`);
    return response.data.exercises;
  },

  // Search exercises by muscle group
  searchExercises: async (muscle?: string): Promise<Exercise[]> => {
    const response = await api.get('/exercises/search', {
      params: muscle ? { muscle } : {}
    });
    return response.data.exercises;
  },

  // Create new exercise
  createExercise: async (exercise: CreateExerciseRequest): Promise<Exercise> => {
    const response = await api.post('/exercises', exercise);
    return response.data.exercise;
  },

  // Update exercise
  updateExercise: async (id: string, updates: Partial<CreateExerciseRequest>): Promise<Exercise> => {
    const response = await api.put(`/exercises/${id}`, updates);
    return response.data.exercise;
  },

  // Delete exercise
  deleteExercise: async (id: string): Promise<void> => {
    await api.delete(`/exercises/${id}`);
  }
};

export const goalsApi = {
  // Get user goals
  getGoals: async (): Promise<UserGoals> => {
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
    const response = await api.get('/goals/week-progress');
    return response.data;
  },

  // Get streak information
  getStreakInfo: async (): Promise<StreakInfo> => {
    const response = await api.get('/goals/streak-info');
    return response.data;
  },

  // Manually update streak (called after workout)
  updateStreak: async (): Promise<UserGoals> => {
    const response = await api.post('/goals/update-streak');
    return response.data;
  }
};

export default api;