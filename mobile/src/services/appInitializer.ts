import { databaseService } from './database';
import { syncService } from './syncService';

class AppInitializer {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing app...');

      // Initialize database
      await databaseService.initialize();
      console.log('Database initialized');

      // Check if this is first launch (no local data)
      const localWorkouts = await databaseService.getWorkouts();
      const localExercises = await databaseService.getExercises();
      const localGoals = await databaseService.getUserGoals();

      const isFirstLaunch = localWorkouts.length === 0 && localExercises.length === 0 && !localGoals;

      if (isFirstLaunch) {
        console.log('First launch detected, attempting initial sync...');

        // Check network connectivity
        const isOnline = await syncService.getNetworkStatus();

        if (isOnline) {
          try {
            await syncService.initialDataSync();
            console.log('Initial sync completed successfully');
          } catch (error) {
            console.error('Initial sync failed:', error);
            throw new Error('First launch requires internet connection to download initial data');
          }
        } else {
          throw new Error('First launch requires internet connection to download initial data');
        }
      } else {
        console.log('Existing data found, attempting background sync...');

        // Try to sync in background (don't block app startup)
        syncService.syncWithServer().catch(error => {
          console.warn('Background sync failed:', error);
        });
      }

      this.isInitialized = true;
      console.log('App initialization completed');
    } catch (error) {
      console.error('App initialization failed:', error);
      throw error;
    }
  }

  async reset(): Promise<void> {
    try {
      await databaseService.close();
      this.isInitialized = false;
    } catch (error) {
      console.error('App reset failed:', error);
    }
  }

  getInitializationStatus(): boolean {
    return this.isInitialized;
  }
}

export const appInitializer = new AppInitializer();