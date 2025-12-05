import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Exercise,
  Workout,
  WorkoutExercise,
  Set,
  UserGoals,
} from "../types/workout";

export interface SyncQueueItem {
  id: string;
  operation: "CREATE" | "UPDATE" | "DELETE";
  tableName: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

interface LocalData {
  exercises: Exercise[];
  workouts: Workout[];
  userGoals: UserGoals | null;
  syncQueue: SyncQueueItem[];
}

class DatabaseService {
  private readonly STORAGE_KEYS = {
    EXERCISES: "@WorkoutTracker:exercises",
    WORKOUTS: "@WorkoutTracker:workouts",
    USER_GOALS: "@WorkoutTracker:userGoals",
    SYNC_QUEUE: "@WorkoutTracker:syncQueue",
  };

  async initialize(): Promise<void> {
    try {
      const exercises = await this.getStoredData(
        this.STORAGE_KEYS.EXERCISES,
        [],
      );
      const workouts = await this.getStoredData(this.STORAGE_KEYS.WORKOUTS, []);
      const userGoals = await this.getStoredData(
        this.STORAGE_KEYS.USER_GOALS,
        null,
      );
      const syncQueue = await this.getStoredData(
        this.STORAGE_KEYS.SYNC_QUEUE,
        [],
      );
    } catch (error) {
      console.error("Database initialization failed:", error);
      throw error;
    }
  }

  private async getStoredData<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error(`Error reading ${key}:`, error);
      return defaultValue;
    }
  }

  private async setStoredData<T>(key: string, data: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error storing ${key}:`, error);
      throw error;
    }
  }

  private generateId(): string {
    return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async addToSyncQueue(
    operation: "CREATE" | "UPDATE" | "DELETE",
    tableName: string,
    data: any,
  ): Promise<void> {
    const syncQueue = await this.getStoredData(
      this.STORAGE_KEYS.SYNC_QUEUE,
      [],
    );

    const queueItem: SyncQueueItem = {
      id: this.generateId(),
      operation,
      tableName,
      data,
      timestamp: Date.now(),
      synced: false,
    };

    syncQueue.push(queueItem);
    await this.setStoredData(this.STORAGE_KEYS.SYNC_QUEUE, syncQueue);
  }

  // Exercises
  async getExercises(): Promise<Exercise[]> {
    return await this.getStoredData(this.STORAGE_KEYS.EXERCISES, []);
  }

  async getExercise(id: string): Promise<Exercise | null> {
    const exercises = await this.getExercises();
    return exercises.find(ex => ex.id === id) || null;
  }

  async saveExercises(exercises: Exercise[]): Promise<void> {
    // Keep local exercises and replace server exercises
    const currentExercises = await this.getExercises();
    const localExercises = currentExercises.filter((ex) =>
      ex.id.startsWith("local_"),
    );
    const combinedExercises = [...exercises, ...localExercises];

    await this.setStoredData(this.STORAGE_KEYS.EXERCISES, combinedExercises);
  }

  async createExercise(exercise: Omit<Exercise, "id">): Promise<Exercise> {
    const newExercise: Exercise = {
      id: this.generateId(),
      ...exercise,
    };

    const exercises = await this.getExercises();
    exercises.push(newExercise);
    await this.setStoredData(this.STORAGE_KEYS.EXERCISES, exercises);
    await this.addToSyncQueue("CREATE", "exercises", newExercise);

    return newExercise;
  }

  async updateExercise(
    id: string,
    updates: Partial<Exercise>,
  ): Promise<Exercise> {
    const exercises = await this.getExercises();
    const exerciseIndex = exercises.findIndex((ex) => ex.id === id);

    if (exerciseIndex === -1) {
      throw new Error(`Exercise with id ${id} not found`);
    }

    const updatedExercise = { ...exercises[exerciseIndex], ...updates };
    exercises[exerciseIndex] = updatedExercise;

    await this.setStoredData(this.STORAGE_KEYS.EXERCISES, exercises);
    await this.addToSyncQueue("UPDATE", "exercises", updatedExercise);

    return updatedExercise;
  }

  async deleteExercise(id: string): Promise<void> {
    const exercises = await this.getExercises();
    const exerciseToDelete = exercises.find((ex) => ex.id === id);

    if (!exerciseToDelete) {
      throw new Error(`Exercise with id ${id} not found`);
    }

    const filteredExercises = exercises.filter((ex) => ex.id !== id);
    await this.setStoredData(this.STORAGE_KEYS.EXERCISES, filteredExercises);
    await this.addToSyncQueue("DELETE", "exercises", exerciseToDelete);
  }

  // Workouts
  async getWorkouts(): Promise<Workout[]> {
    const workouts = await this.getStoredData(this.STORAGE_KEYS.WORKOUTS, []);
    // Sort by date (newest first)
    return workouts.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async saveWorkouts(workouts: Workout[]): Promise<void> {
    // Keep local workouts and replace server workouts
    const currentWorkouts = await this.getWorkouts();
    const localWorkouts = currentWorkouts.filter((w) =>
      w.id.startsWith("local_"),
    );
    const combinedWorkouts = [...workouts, ...localWorkouts];

    await this.setStoredData(this.STORAGE_KEYS.WORKOUTS, combinedWorkouts);
  }

  async createWorkout(workout: Omit<Workout, "id">): Promise<Workout> {
    const newWorkout: Workout = {
      id: this.generateId(),
      ...workout,
      exercises: workout.exercises.map((exercise) => ({
        ...exercise,
        id: this.generateId(),
        sets: exercise.sets.map((set) => ({
          ...set,
          id: this.generateId(),
        })),
      })),
    };

    const workouts = await this.getWorkouts();
    workouts.push(newWorkout);
    await this.setStoredData(this.STORAGE_KEYS.WORKOUTS, workouts);
    await this.addToSyncQueue("CREATE", "workouts", newWorkout);

    return newWorkout;
  }

  async updateWorkout(id: string, updates: Partial<Workout>): Promise<Workout> {
    const workouts = await this.getWorkouts();
    const workoutIndex = workouts.findIndex((w) => w.id === id);

    if (workoutIndex === -1) {
      throw new Error(`Workout with id ${id} not found`);
    }

    const updatedWorkout = { ...workouts[workoutIndex], ...updates };
    workouts[workoutIndex] = updatedWorkout;

    await this.setStoredData(this.STORAGE_KEYS.WORKOUTS, workouts);
    await this.addToSyncQueue("UPDATE", "workouts", updatedWorkout);

    return updatedWorkout;
  }

  async deleteWorkout(id: string): Promise<void> {
    const workouts = await this.getWorkouts();
    const workoutToDelete = workouts.find((w) => w.id === id);

    if (!workoutToDelete) {
      throw new Error(`Workout with id ${id} not found`);
    }

    const filteredWorkouts = workouts.filter((w) => w.id !== id);
    await this.setStoredData(this.STORAGE_KEYS.WORKOUTS, filteredWorkouts);
    await this.addToSyncQueue("DELETE", "workouts", workoutToDelete);
  }

  async getWorkout(id: string): Promise<Workout | null> {
    const workouts = await this.getWorkouts();
    return workouts.find((w) => w.id === id) || null;
  }

  // User Goals
  async getUserGoals(): Promise<UserGoals | null> {
    return await this.getStoredData(this.STORAGE_KEYS.USER_GOALS, null);
  }

  async saveUserGoals(goals: UserGoals): Promise<void> {
    await this.setStoredData(this.STORAGE_KEYS.USER_GOALS, goals);
  }

  async updateUserGoals(updates: Partial<UserGoals>): Promise<UserGoals> {
    const currentGoals = await this.getUserGoals();
    if (!currentGoals) {
      throw new Error("No goals found to update");
    }

    const updatedGoals: UserGoals = {
      ...currentGoals,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await this.setStoredData(this.STORAGE_KEYS.USER_GOALS, updatedGoals);
    await this.addToSyncQueue("UPDATE", "user_goals", updatedGoals);

    return updatedGoals;
  }

  async createUserGoals(
    goals: Omit<UserGoals, "id" | "createdAt" | "updatedAt">,
  ): Promise<UserGoals> {
    const newGoals: UserGoals = {
      id: this.generateId(),
      ...goals,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.setStoredData(this.STORAGE_KEYS.USER_GOALS, newGoals);
    await this.addToSyncQueue("CREATE", "user_goals", newGoals);

    return newGoals;
  }

  // Sync Queue Management
  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const syncQueue = await this.getStoredData(
      this.STORAGE_KEYS.SYNC_QUEUE,
      [],
    );
    return syncQueue.filter((item: SyncQueueItem) => !item.synced);
  }

  async markSynced(syncItemId: string): Promise<void> {
    const syncQueue = await this.getStoredData(
      this.STORAGE_KEYS.SYNC_QUEUE,
      [],
    );
    const itemIndex = syncQueue.findIndex(
      (item: SyncQueueItem) => item.id === syncItemId,
    );

    if (itemIndex !== -1) {
      syncQueue[itemIndex].synced = true;
      await this.setStoredData(this.STORAGE_KEYS.SYNC_QUEUE, syncQueue);
    }
  }

  async clearSyncedItems(): Promise<void> {
    const syncQueue = await this.getStoredData(
      this.STORAGE_KEYS.SYNC_QUEUE,
      [],
    );
    const pendingItems = syncQueue.filter(
      (item: SyncQueueItem) => !item.synced,
    );
    await this.setStoredData(this.STORAGE_KEYS.SYNC_QUEUE, pendingItems);
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(this.STORAGE_KEYS.EXERCISES),
      AsyncStorage.removeItem(this.STORAGE_KEYS.WORKOUTS),
      AsyncStorage.removeItem(this.STORAGE_KEYS.USER_GOALS),
      AsyncStorage.removeItem(this.STORAGE_KEYS.SYNC_QUEUE),
    ]);
  }

  async getStorageInfo(): Promise<{
    exercises: number;
    workouts: number;
    syncQueue: number;
  }> {
    const [exercises, workouts, syncQueue] = await Promise.all([
      this.getExercises(),
      this.getWorkouts(),
      this.getSyncQueue(),
    ]);

    return {
      exercises: exercises.length,
      workouts: workouts.length,
      syncQueue: syncQueue.length,
    };
  }
}

export const databaseService = new DatabaseService();
