import { renderHook } from '@testing-library/react-native';
import { useOfflineWorkout } from '../../hooks/useOfflineWorkout';

// Mock dependencies
jest.mock('../../services/syncService', () => ({
  syncService: {
    addSyncListener: jest.fn(() => jest.fn()),
    getSyncStatus: jest.fn(() => ({
      isOnline: true,
      isSyncing: false,
      pendingItems: 0,
      lastSyncTime: null,
    })),
    forceSyncNow: jest.fn(),
  },
}));

jest.mock('../../services/database', () => ({
  databaseService: {
    createWorkout: jest.fn((workout) => Promise.resolve({
      id: 'test-workout-id',
      ...workout,
    })),
    getWorkouts: jest.fn(() => Promise.resolve([])),
    updateWorkout: jest.fn(),
    deleteWorkout: jest.fn(),
    getWorkout: jest.fn(),
    getExercise: jest.fn(),
  },
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
  }),
}));

describe('useOfflineWorkout', () => {
  it('should initialize with default state', () => {
    const { result } = renderHook(() => useOfflineWorkout());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isSyncing).toBe(false);
    expect(result.current.pendingItems).toBe(0);
    expect(result.current.createWorkout).toBeDefined();
    expect(result.current.getWorkouts).toBeDefined();
    expect(result.current.updateWorkout).toBeDefined();
    expect(result.current.deleteWorkout).toBeDefined();
    expect(result.current.forcSync).toBeDefined();
  });

  it('should provide all required methods', () => {
    const { result } = renderHook(() => useOfflineWorkout());

    expect(typeof result.current.createWorkout).toBe('function');
    expect(typeof result.current.getWorkouts).toBe('function');
    expect(typeof result.current.updateWorkout).toBe('function');
    expect(typeof result.current.deleteWorkout).toBe('function');
    expect(typeof result.current.addExerciseToWorkout).toBe('function');
    expect(typeof result.current.removeExerciseFromWorkout).toBe('function');
    expect(typeof result.current.addSet).toBe('function');
    expect(typeof result.current.updateSet).toBe('function');
    expect(typeof result.current.removeSet).toBe('function');
    expect(typeof result.current.forcSync).toBe('function');
  });
});