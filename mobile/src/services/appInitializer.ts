import { databaseService } from "./database";
import { syncService } from "./syncService";
import { secureStorage } from "./secureStorage";

class AppInitializer {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await databaseService.initialize();

      // Only proceed with sync if user is authenticated
      const authData = await secureStorage.getAuthData();
      const isAuthenticated = authData && authData.type !== "guest";

      if (!isAuthenticated) {
        this.isInitialized = true;
        return;
      }

      const localWorkouts = await databaseService.getWorkouts();
      const localExercises = await databaseService.getExercises();
      const localGoals = await databaseService.getUserGoals();

      const isFirstLaunch =
        localWorkouts.length === 0 &&
        localExercises.length === 0 &&
        !localGoals;

      if (isFirstLaunch) {
        const isOnline = await syncService.getNetworkStatus();

        try {
          await syncService.initialDataSync();
        } catch (error) {
          console.error("Initial sync failed:", error);
        }
      } else {
        syncService.syncWithServer().catch((error) => {
          console.warn("Background sync failed:", error);
        });
      }

      this.isInitialized = true;
    } catch (error) {
      console.error("App initialization failed:", error);
      throw error;
    }
  }

  async reset(): Promise<void> {
    try {
      await databaseService.close();
      this.isInitialized = false;
    } catch (error) {
      console.error("App reset failed:", error);
    }
  }

  getInitializationStatus(): boolean {
    return this.isInitialized;
  }
}

export const appInitializer = new AppInitializer();
