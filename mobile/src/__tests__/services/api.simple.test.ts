import { workoutApi, exerciseApi, goalsApi } from '../../services/api';

// Mock axios
jest.mock('axios');

// Mock secure storage
jest.mock('../../services/secureStorage', () => ({
  secureStorage: {
    getAuthData: jest.fn(() => Promise.resolve({ type: 'admin' })),
    getAccessToken: jest.fn(() => Promise.resolve('test-token')),
  },
}));

// Mock MockDataService
jest.mock('../../services/mockDataService', () => ({
  MockDataService: {
    getInstance: jest.fn(() => ({
      getWorkouts: jest.fn(() => Promise.resolve([])),
      getExercises: jest.fn(() => Promise.resolve([])),
      getGoals: jest.fn(() => Promise.resolve({})),
    })),
  },
}));

describe('API Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('workoutApi', () => {
    it('should have all required methods', () => {
      expect(workoutApi.getWorkouts).toBeDefined();
      expect(workoutApi.getWorkout).toBeDefined();
      expect(workoutApi.createWorkout).toBeDefined();
      expect(workoutApi.updateWorkout).toBeDefined();
      expect(workoutApi.deleteWorkout).toBeDefined();
      expect(workoutApi.addExerciseToWorkout).toBeDefined();
      expect(workoutApi.getLastExerciseWeight).toBeDefined();
    });
  });

  describe('exerciseApi', () => {
    it('should have all required methods', () => {
      expect(exerciseApi.getExercises).toBeDefined();
      expect(exerciseApi.getExercise).toBeDefined();
      expect(exerciseApi.getExercisesByCategory).toBeDefined();
      expect(exerciseApi.searchExercises).toBeDefined();
      expect(exerciseApi.createExercise).toBeDefined();
      expect(exerciseApi.updateExercise).toBeDefined();
      expect(exerciseApi.deleteExercise).toBeDefined();
    });
  });

  describe('goalsApi', () => {
    it('should have all required methods', () => {
      expect(goalsApi.getGoals).toBeDefined();
      expect(goalsApi.updateGoals).toBeDefined();
      expect(goalsApi.getWeekProgress).toBeDefined();
      expect(goalsApi.getStreakInfo).toBeDefined();
      expect(goalsApi.updateStreak).toBeDefined();
    });
  });
});