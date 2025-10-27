import NetInfo from "@react-native-community/netinfo";
import { databaseService, SyncQueueItem } from "./database";
import { workoutApi, exerciseApi, goalsApi } from "./api";
import { Workout, Exercise, UserGoals } from "../types/workout";

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingItems: number;
}

class SyncService {
  private isOnline: boolean = false;
  private isSyncing: boolean = false;
  private lastSyncTime: number | null = null;
  private syncListeners: ((status: SyncStatus) => void)[] = [];

  constructor() {
    this.initializeNetworkListener();
  }

  private initializeNetworkListener(): void {
    NetInfo.addEventListener((state) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected === true;

      if (!wasOnline && this.isOnline) {
        this.syncWithServer();
      }

      this.notifyListeners();
    });
  }

  addSyncListener(listener: (status: SyncStatus) => void): () => void {
    this.syncListeners.push(listener);
    return () => {
      const index = this.syncListeners.indexOf(listener);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    const status: SyncStatus = {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingItems: 0, // Will be updated by specific methods
    };

    this.syncListeners.forEach((listener) => listener(status));
  }

  async getNetworkStatus(): Promise<boolean> {
    const state = await NetInfo.fetch();
    this.isOnline = state.isConnected === true;
    return this.isOnline;
  }

  async initialDataSync(): Promise<void> {
    if (!this.isOnline) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const exercises = await exerciseApi.getExercises();
      await databaseService.saveExercises(exercises);

      const workouts = await workoutApi.getWorkouts();
      await databaseService.saveWorkouts(workouts);

      try {
        const goals = await goalsApi.getGoals();
        await databaseService.saveUserGoals(goals);
      } catch (error) {
        console.error(error);
      }

      this.lastSyncTime = Date.now();
    } catch (error) {
      console.error("Initial sync failed:", error);
      throw error;
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  async syncWithServer(): Promise<void> {
    if (!this.isOnline || this.isSyncing) {
      return;
    }

    this.isSyncing = true;
    this.notifyListeners();

    try {
      const syncQueue = await databaseService.getSyncQueue();

      for (const item of syncQueue) {
        try {
          await this.processSyncItem(item);
          await databaseService.markSynced(item.id);
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          // Don't mark as synced if it failed
        }
      }

      // Download latest data from server
      await this.downloadLatestData();

      // Clean up synced items
      await databaseService.clearSyncedItems();

      this.lastSyncTime = Date.now();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  private async processSyncItem(item: SyncQueueItem): Promise<void> {
    switch (item.tableName) {
      case "workouts":
        await this.syncWorkout(item);
        break;
      case "exercises":
        await this.syncExercise(item);
        break;
      case "user_goals":
        await this.syncUserGoals(item);
        break;
      default:
        console.warn(`Unknown table for sync: ${item.tableName}`);
    }
  }

  private async syncWorkout(item: SyncQueueItem): Promise<void> {
    const workout: Workout = item.data;

    switch (item.operation) {
      case "CREATE":
        // Transform local workout to server format
        const serverWorkout = await workoutApi.createWorkout({
          name: workout.name,
          date: workout.date,
          workoutType: workout.workoutType,
          dayOfWeek: workout.dayOfWeek,
          notes: workout.notes,
        });

        // Update local workout exercises with server IDs
        for (const exercise of workout.exercises) {
          await workoutApi.addExerciseToWorkout(
            serverWorkout.id,
            exercise.exerciseId,
            exercise.sets,
          );
        }
        break;

      case "UPDATE":
        await workoutApi.updateWorkout(workout.id, {
          name: workout.name,
          exercises: workout.exercises,
          notes: workout.notes,
          endTime: workout.endTime,
        });
        break;

      case "DELETE":
        await workoutApi.deleteWorkout(workout.id);
        break;
    }
  }

  private async syncExercise(item: SyncQueueItem): Promise<void> {
    const exercise: Exercise = item.data;

    switch (item.operation) {
      case "CREATE":
        await exerciseApi.createExercise({
          name: exercise.name,
          category: exercise.category,
          muscleGroups: exercise.muscleGroups,
        });
        break;

      case "UPDATE":
        await exerciseApi.updateExercise(exercise.id, {
          name: exercise.name,
          category: exercise.category,
          muscleGroups: exercise.muscleGroups,
        });
        break;

      case "DELETE":
        await exerciseApi.deleteExercise(exercise.id);
        break;
    }
  }

  private async syncUserGoals(item: SyncQueueItem): Promise<void> {
    const goals: UserGoals = item.data;

    switch (item.operation) {
      case "CREATE":
      case "UPDATE":
        await goalsApi.updateGoals({
          weeklyWorkoutGoal: goals.weeklyWorkoutGoal,
        });
        break;
    }
  }

  private async downloadLatestData(): Promise<void> {
    try {
      // Download latest exercises
      const exercises = await exerciseApi.getExercises();
      await databaseService.saveExercises(exercises);

      // Download latest workouts
      const workouts = await workoutApi.getWorkouts();
      await databaseService.saveWorkouts(workouts);

      // Download latest goals
      try {
        const goals = await goalsApi.getGoals();
        await databaseService.saveUserGoals(goals);
      } catch (error) {
        console.error(error);
      }
    } catch (error) {
      console.error("Failed to download latest data:", error);
    }
  }

  async getPendingItemsCount(): Promise<number> {
    const syncQueue = await databaseService.getSyncQueue();
    return syncQueue.length;
  }

  getSyncStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingItems: 0, // This will be updated by calling getPendingItemsCount()
    };
  }

  async forceSyncNow(): Promise<void> {
    await this.syncWithServer();
  }
}

export const syncService = new SyncService();
