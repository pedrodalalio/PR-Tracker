import { useState, useEffect } from 'react';
import { syncService } from '../services/syncService';
import { databaseService } from '../services/database';
import { Workout, WorkoutExercise, Set } from '../types/workout';
import { useAuth } from '../contexts/AuthContext';

interface OfflineWorkoutHook {
  // Status
  isOnline: boolean;
  isSyncing: boolean;
  pendingItems: number;

  // Workout operations
  createWorkout: (workout: Partial<Workout>) => Promise<Workout>;
  getWorkouts: () => Promise<Workout[]>;
  updateWorkout: (id: string, workout: Partial<Workout>) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;

  // Exercise operations
  addExerciseToWorkout: (workoutId: string, exerciseId: string) => Promise<WorkoutExercise>;
  removeExerciseFromWorkout: (workoutId: string, exerciseId: string) => Promise<void>;

  // Set operations
  addSet: (workoutExerciseId: string, set: Partial<Set>) => Promise<Set>;
  updateSet: (setId: string, set: Partial<Set>) => Promise<void>;
  removeSet: (setId: string) => Promise<void>;

  // Sync operations
  forcSync: () => Promise<void>;
}

export function useOfflineWorkout(): OfflineWorkoutHook {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingItems, setPendingItems] = useState(0);

  useEffect(() => {
    // Listen for sync status changes
    const unsubscribe = syncService.addSyncListener((status) => {
      setIsOnline(status.isOnline);
      setIsSyncing(status.isSyncing);
      setPendingItems(status.pendingItems);
    });

    // Get initial status
    const status = syncService.getSyncStatus();
    setIsOnline(status.isOnline);
    setIsSyncing(status.isSyncing);
    setPendingItems(status.pendingItems);

    return unsubscribe;
  }, []);

  const createWorkout = async (workoutData: Partial<Workout>): Promise<Workout> => {
    if (!user) throw new Error('User not authenticated');

    const workoutWithoutId: Omit<Workout, "id"> = {
      name: workoutData.name || 'Novo Treino',
      date: workoutData.date || new Date().toISOString(),
      workoutType: workoutData.workoutType || 'upper',
      dayOfWeek: workoutData.dayOfWeek || 'segunda',
      exercises: workoutData.exercises || [],
      startTime: workoutData.startTime,
      endTime: workoutData.endTime,
      notes: workoutData.notes,
    };

    // Save locally first (offline-first approach) - use createWorkout method
    const createdWorkout = await databaseService.createWorkout(workoutWithoutId);

    // Add to sync queue if we have network
    if (isOnline) {
      await syncService.forceSyncNow();
    }

    return createdWorkout;
  };

  const getWorkouts = async (): Promise<Workout[]> => {
    // Always read from local database (faster and works offline)
    return await databaseService.getWorkouts();
  };

  const updateWorkout = async (id: string, workoutData: Partial<Workout>): Promise<void> => {
    const existingWorkout = await databaseService.getWorkout(id);
    if (!existingWorkout) throw new Error('Workout not found');

    await databaseService.updateWorkout(id, workoutData);

    if (isOnline) {
      await syncService.forceSyncNow();
    }
  };

  const deleteWorkout = async (id: string): Promise<void> => {
    await databaseService.deleteWorkout(id);

    if (isOnline) {
      await syncService.forceSyncNow();
    }
  };

  const addExerciseToWorkout = async (
    workoutId: string,
    exerciseId: string
  ): Promise<WorkoutExercise> => {
    const workout = await databaseService.getWorkout(workoutId);
    if (!workout) throw new Error('Workout not found');

    const exercise = await databaseService.getExercise(exerciseId);
    if (!exercise) throw new Error('Exercise not found');

    const workoutExercise: WorkoutExercise = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      exerciseId: exercise.id,
      exercise: exercise,
      sets: [],
      notes: '',
    };

    const updatedWorkout = {
      ...workout,
      exercises: [...workout.exercises, workoutExercise],
      updatedAt: new Date().toISOString(),
    };

    await databaseService.updateWorkout(workoutId, updatedWorkout);

    if (isOnline) {
      await syncService.forceSyncNow();
    }

    return workoutExercise;
  };

  const removeExerciseFromWorkout = async (
    workoutId: string,
    exerciseId: string
  ): Promise<void> => {
    const workout = await databaseService.getWorkout(workoutId);
    if (!workout) throw new Error('Workout not found');

    const updatedWorkout = {
      ...workout,
      exercises: workout.exercises.filter(ex => ex.exerciseId !== exerciseId),
      updatedAt: new Date().toISOString(),
    };

    await databaseService.updateWorkout(workoutId, updatedWorkout);

    if (isOnline) {
      await syncService.forceSyncNow();
    }
  };

  const addSet = async (workoutExerciseId: string, setData: Partial<Set>): Promise<Set> => {
    const set: Set = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reps: setData.reps || 0,
      weight: setData.weight || 0,
      duration: setData.duration,
      distance: setData.distance,
      pace: setData.pace,
    };

    // Find workout containing this exercise
    const workouts = await databaseService.getWorkouts();
    let targetWorkout: Workout | null = null;
    let targetExerciseIndex = -1;

    for (const workout of workouts) {
      const exerciseIndex = workout.exercises.findIndex(ex => ex.id === workoutExerciseId);
      if (exerciseIndex !== -1) {
        targetWorkout = workout;
        targetExerciseIndex = exerciseIndex;
        break;
      }
    }

    if (!targetWorkout || targetExerciseIndex === -1) {
      throw new Error('Workout exercise not found');
    }

    // Update the workout with the new set
    const updatedExercises = [...targetWorkout.exercises];
    updatedExercises[targetExerciseIndex] = {
      ...updatedExercises[targetExerciseIndex],
      sets: [...updatedExercises[targetExerciseIndex].sets, set],
    };

    const updatedWorkout = {
      ...targetWorkout,
      exercises: updatedExercises,
      updatedAt: new Date().toISOString(),
    };

    await databaseService.updateWorkout(targetWorkout.id, updatedWorkout);

    if (isOnline) {
      await syncService.forceSyncNow();
    }

    return set;
  };

  const updateSet = async (setId: string, setData: Partial<Set>): Promise<void> => {
    // Find the workout and exercise containing this set
    const workouts = await databaseService.getWorkouts();
    let targetWorkout: Workout | null = null;
    let targetExerciseIndex = -1;
    let targetSetIndex = -1;

    for (const workout of workouts) {
      for (let i = 0; i < workout.exercises.length; i++) {
        const setIndex = workout.exercises[i].sets.findIndex(set => set.id === setId);
        if (setIndex !== -1) {
          targetWorkout = workout;
          targetExerciseIndex = i;
          targetSetIndex = setIndex;
          break;
        }
      }
      if (targetWorkout) break;
    }

    if (!targetWorkout || targetExerciseIndex === -1 || targetSetIndex === -1) {
      throw new Error('Set not found');
    }

    // Update the set
    const updatedExercises = [...targetWorkout.exercises];
    const updatedSets = [...updatedExercises[targetExerciseIndex].sets];
    updatedSets[targetSetIndex] = {
      ...updatedSets[targetSetIndex],
      ...setData,
    };

    updatedExercises[targetExerciseIndex] = {
      ...updatedExercises[targetExerciseIndex],
      sets: updatedSets,
    };

    const updatedWorkout = {
      ...targetWorkout,
      exercises: updatedExercises,
      updatedAt: new Date().toISOString(),
    };

    await databaseService.updateWorkout(targetWorkout.id, updatedWorkout);

    if (isOnline) {
      await syncService.forceSyncNow();
    }
  };

  const removeSet = async (setId: string): Promise<void> => {
    // Find and remove the set
    const workouts = await databaseService.getWorkouts();
    let targetWorkout: Workout | null = null;
    let targetExerciseIndex = -1;

    for (const workout of workouts) {
      for (let i = 0; i < workout.exercises.length; i++) {
        if (workout.exercises[i].sets.some(set => set.id === setId)) {
          targetWorkout = workout;
          targetExerciseIndex = i;
          break;
        }
      }
      if (targetWorkout) break;
    }

    if (!targetWorkout || targetExerciseIndex === -1) {
      throw new Error('Set not found');
    }

    // Remove the set
    const updatedExercises = [...targetWorkout.exercises];
    updatedExercises[targetExerciseIndex] = {
      ...updatedExercises[targetExerciseIndex],
      sets: updatedExercises[targetExerciseIndex].sets.filter(set => set.id !== setId),
    };

    const updatedWorkout = {
      ...targetWorkout,
      exercises: updatedExercises,
      updatedAt: new Date().toISOString(),
    };

    await databaseService.updateWorkout(targetWorkout.id, updatedWorkout);

    if (isOnline) {
      await syncService.forceSyncNow();
    }
  };

  const forcSync = async (): Promise<void> => {
    await syncService.forceSyncNow();
  };

  return {
    isOnline,
    isSyncing,
    pendingItems,
    createWorkout,
    getWorkouts,
    updateWorkout,
    deleteWorkout,
    addExerciseToWorkout,
    removeExerciseFromWorkout,
    addSet,
    updateSet,
    removeSet,
    forcSync,
  };
}

export default useOfflineWorkout;