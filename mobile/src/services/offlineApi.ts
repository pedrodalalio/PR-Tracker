import { databaseService } from './database';
import { syncService } from './syncService';
import { workoutApi as onlineWorkoutApi, exerciseApi as onlineExerciseApi, goalsApi as onlineGoalsApi } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { secureStorage } from './secureStorage';
import {
  Workout,
  Exercise,
  CreateWorkoutRequest,
  UpdateWorkoutRequest,
  CreateExerciseRequest,
  UserGoals,
  UpdateGoalsRequest,
  WeeklyProgress,
  StreakInfo
} from '../types/workout';

const AUTH_STORAGE_KEY = '@pr_tracker_auth';

// Função auxiliar para verificar se o usuário está autenticado e não é guest
async function isAuthenticatedUser(): Promise<boolean> {
  try {
    const authData = await secureStorage.getAuthData();
    if (authData && authData.type === 'admin') {
      const accessToken = await secureStorage.getAccessToken();
      return !!accessToken;
    }
  } catch (error) {
    console.error('Error checking authentication status:', error);
  }
  return false;
}

class OfflineWorkoutApi {
  async getWorkouts(): Promise<Workout[]> {
    const isOnline = await syncService.getNetworkStatus();
    const isAuthenticated = await isAuthenticatedUser();

    if (isOnline && isAuthenticated) {
      try {
        const workouts = await onlineWorkoutApi.getWorkouts();
        await databaseService.saveWorkouts(workouts);
        return workouts;
      } catch (error) {
        console.warn('Failed to fetch workouts online, using offline data:', error);
      }
    }

    return await databaseService.getWorkouts();
  }

  async getWorkout(id: string): Promise<Workout> {
    const isOnline = await syncService.getNetworkStatus();
    const isAuthenticated = await isAuthenticatedUser();

    if (isOnline && isAuthenticated) {
      try {
        return await onlineWorkoutApi.getWorkout(id);
      } catch (error) {
        console.warn('Failed to fetch workout online, using offline data:', error);
      }
    }

    const workouts = await databaseService.getWorkouts();
    const workout = workouts.find(w => w.id === id);
    if (!workout) {
      throw new Error(`Workout with id ${id} not found`);
    }
    return workout;
  }

  async createWorkout(workout: CreateWorkoutRequest): Promise<Workout> {
    const isOnline = await syncService.getNetworkStatus();

    if (isOnline) {
      try {
        const newWorkout = await onlineWorkoutApi.createWorkout(workout);
        // Also save to local storage for offline access
        const localWorkouts = await databaseService.getWorkouts();
        await databaseService.saveWorkouts([...localWorkouts, newWorkout]);
        return newWorkout;
      } catch (error) {
        console.warn('Failed to create workout online, saving offline:', error);
      }
    }

    return await databaseService.createWorkout({
      ...workout,
      exercises: workout.exercises || []
    });
  }

  async updateWorkout(id: string, updates: UpdateWorkoutRequest): Promise<Workout> {
    const isOnline = await syncService.getNetworkStatus();

    if (isOnline) {
      try {
        const updatedWorkout = await onlineWorkoutApi.updateWorkout(id, updates);
        // Update local storage
        const localWorkouts = await databaseService.getWorkouts();
        const updatedWorkouts = localWorkouts.map(w => w.id === id ? updatedWorkout : w);
        await databaseService.saveWorkouts(updatedWorkouts);
        return updatedWorkout;
      } catch (error) {
        console.warn('Failed to update workout online, updating offline:', error);
      }
    }

    const localWorkouts = await databaseService.getWorkouts();
    const workoutIndex = localWorkouts.findIndex(w => w.id === id);
    if (workoutIndex === -1) {
      throw new Error(`Workout with id ${id} not found`);
    }

    const updatedWorkout = {
      ...localWorkouts[workoutIndex],
      ...updates
    };

    localWorkouts[workoutIndex] = updatedWorkout;
    await databaseService.saveWorkouts(localWorkouts);

    return updatedWorkout;
  }

  async deleteWorkout(id: string): Promise<void> {
    const isOnline = await syncService.getNetworkStatus();

    if (isOnline) {
      try {
        await onlineWorkoutApi.deleteWorkout(id);
        // Also remove from local storage
        const localWorkouts = await databaseService.getWorkouts();
        const filteredWorkouts = localWorkouts.filter(w => w.id !== id);
        await databaseService.saveWorkouts(filteredWorkouts);
        return;
      } catch (error) {
        console.warn('Failed to delete workout online, marking for deletion:', error);
      }
    }

    const localWorkouts = await databaseService.getWorkouts();
    const filteredWorkouts = localWorkouts.filter(w => w.id !== id);
    await databaseService.saveWorkouts(filteredWorkouts);
  }

  async addExerciseToWorkout(workoutId: string, exerciseId: string, sets: any[] = []): Promise<any> {
    const isOnline = await syncService.getNetworkStatus();

    if (isOnline) {
      try {
        return await onlineWorkoutApi.addExerciseToWorkout(workoutId, exerciseId, sets);
      } catch (error) {
        console.warn('Failed to add exercise online, adding offline:', error);
      }
    }

    // Handle offline exercise addition
    const localWorkouts = await databaseService.getWorkouts();
    const workout = localWorkouts.find(w => w.id === workoutId);
    if (!workout) {
      throw new Error(`Workout with id ${workoutId} not found`);
    }

    const exercises = await databaseService.getExercises();
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) {
      throw new Error(`Exercise with id ${exerciseId} not found`);
    }

    const newWorkoutExercise = {
      id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      exerciseId,
      exercise,
      sets: sets.map(set => ({
        ...set,
        id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      })),
      notes: ''
    };

    workout.exercises.push(newWorkoutExercise);
    await databaseService.saveWorkouts(localWorkouts);

    return newWorkoutExercise;
  }
}

class OfflineExerciseApi {
  async getExercises(): Promise<Exercise[]> {
    const isOnline = await syncService.getNetworkStatus();

    if (isOnline) {
      try {
        const exercises = await onlineExerciseApi.getExercises();
        await databaseService.saveExercises(exercises);
        return exercises;
      } catch (error) {
        console.warn('Failed to fetch exercises online, using offline data:', error);
      }
    }

    return await databaseService.getExercises();
  }

  async getExercise(id: string): Promise<Exercise> {
    const isOnline = await syncService.getNetworkStatus();

    if (isOnline) {
      try {
        return await onlineExerciseApi.getExercise(id);
      } catch (error) {
        console.warn('Failed to fetch exercise online, using offline data:', error);
      }
    }

    const exercises = await databaseService.getExercises();
    const exercise = exercises.find(e => e.id === id);
    if (!exercise) {
      throw new Error(`Exercise with id ${id} not found`);
    }
    return exercise;
  }

  async getExercisesByCategory(category: string): Promise<Exercise[]> {
    const exercises = await this.getExercises();
    return exercises.filter(e => e.category === category);
  }

  async searchExercises(muscle?: string): Promise<Exercise[]> {
    const exercises = await this.getExercises();
    if (!muscle) return exercises;

    return exercises.filter(e =>
      e.muscleGroups.some(mg =>
        mg.toLowerCase().includes(muscle.toLowerCase())
      )
    );
  }

  async createExercise(exercise: CreateExerciseRequest): Promise<Exercise> {
    const isOnline = await syncService.getNetworkStatus();

    if (isOnline) {
      try {
        const newExercise = await onlineExerciseApi.createExercise(exercise);
        // Also save to local storage
        const localExercises = await databaseService.getExercises();
        await databaseService.saveExercises([...localExercises, newExercise]);
        return newExercise;
      } catch (error) {
        console.warn('Failed to create exercise online, saving offline:', error);
      }
    }

    return await databaseService.createExercise(exercise);
  }

  async updateExercise(id: string, updates: Partial<CreateExerciseRequest>): Promise<Exercise> {
    const isOnline = await syncService.getNetworkStatus();

    if (isOnline) {
      try {
        const updatedExercise = await onlineExerciseApi.updateExercise(id, updates);
        // Update local storage
        const localExercises = await databaseService.getExercises();
        const updatedExercises = localExercises.map(e => e.id === id ? updatedExercise : e);
        await databaseService.saveExercises(updatedExercises);
        return updatedExercise;
      } catch (error) {
        console.warn('Failed to update exercise online, updating offline:', error);
      }
    }

    const localExercises = await databaseService.getExercises();
    const exerciseIndex = localExercises.findIndex(e => e.id === id);
    if (exerciseIndex === -1) {
      throw new Error(`Exercise with id ${id} not found`);
    }

    const updatedExercise = {
      ...localExercises[exerciseIndex],
      ...updates
    };

    localExercises[exerciseIndex] = updatedExercise;
    await databaseService.saveExercises(localExercises);

    return updatedExercise;
  }

  async deleteExercise(id: string): Promise<void> {
    const isOnline = await syncService.getNetworkStatus();

    if (isOnline) {
      try {
        await onlineExerciseApi.deleteExercise(id);
        // Also remove from local storage
        const localExercises = await databaseService.getExercises();
        const filteredExercises = localExercises.filter(e => e.id !== id);
        await databaseService.saveExercises(filteredExercises);
        return;
      } catch (error) {
        console.warn('Failed to delete exercise online, marking for deletion:', error);
      }
    }

    const localExercises = await databaseService.getExercises();
    const filteredExercises = localExercises.filter(e => e.id !== id);
    await databaseService.saveExercises(filteredExercises);
  }
}

class OfflineGoalsApi {
  async getGoals(): Promise<UserGoals> {
    const isOnline = await syncService.getNetworkStatus();
    const isAuthenticated = await isAuthenticatedUser();

    // Só tenta fazer requisição online se o usuário estiver autenticado
    if (isOnline && isAuthenticated) {
      try {
        const goals = await onlineGoalsApi.getGoals();
        await databaseService.saveUserGoals(goals);
        return goals;
      } catch (error) {
        console.warn('Failed to fetch goals online, using offline data:', error);
      }
    }

    const localGoals = await databaseService.getUserGoals();
    if (!localGoals) {
      // Se não há dados locais e não está autenticado, criar dados padrão
      if (!isAuthenticated) {
        const defaultGoals: UserGoals = {
          id: 'default',
          userId: 'guest',
          weeklyWorkoutGoal: 3,
          currentStreak: 0,
          bestStreak: 0,
          totalWeeksCompleted: 0,
          lastWorkoutDate: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await databaseService.saveUserGoals(defaultGoals);
        return defaultGoals;
      }
      throw new Error('No goals found');
    }
    return localGoals;
  }

  async updateGoals(updates: UpdateGoalsRequest): Promise<UserGoals> {
    const isOnline = await syncService.getNetworkStatus();
    const isAuthenticated = await isAuthenticatedUser();

    // Só tenta fazer requisição online se o usuário estiver autenticado
    if (isOnline && isAuthenticated) {
      try {
        const updatedGoals = await onlineGoalsApi.updateGoals(updates);
        await databaseService.saveUserGoals(updatedGoals);
        return updatedGoals;
      } catch (error) {
        console.warn('Failed to update goals online, updating offline:', error);
      }
    }

    return await databaseService.updateUserGoals(updates);
  }

  async getWeekProgress(): Promise<WeeklyProgress> {
    const isOnline = await syncService.getNetworkStatus();
    const isAuthenticated = await isAuthenticatedUser();

    // Só tenta fazer requisição online se o usuário estiver autenticado
    if (isOnline && isAuthenticated) {
      try {
        return await onlineGoalsApi.getWeekProgress();
      } catch (error) {
        console.warn('Failed to fetch week progress online, calculating offline:', error);
      }
    }

    // Calculate offline week progress
    const workouts = await databaseService.getWorkouts();
    const goals = await databaseService.getUserGoals();

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday
    weekEnd.setHours(23, 59, 59, 999);

    const weekWorkouts = workouts.filter(workout => {
      const workoutDate = new Date(workout.date);
      return workoutDate >= weekStart && workoutDate <= weekEnd;
    });

    return {
      weekStartDate: weekStart.toISOString(),
      weekEndDate: weekEnd.toISOString(),
      targetWorkouts: goals?.weeklyWorkoutGoal || 3,
      completedWorkouts: weekWorkouts.length,
      isCompleted: weekWorkouts.length >= (goals?.weeklyWorkoutGoal || 3),
      workouts: weekWorkouts
    };
  }

  async getStreakInfo(): Promise<StreakInfo> {
    const isOnline = await syncService.getNetworkStatus();
    const isAuthenticated = await isAuthenticatedUser();

    // Só tenta fazer requisição online se o usuário estiver autenticado
    if (isOnline && isAuthenticated) {
      try {
        return await onlineGoalsApi.getStreakInfo();
      } catch (error) {
        console.warn('Failed to fetch streak info online, calculating offline:', error);
      }
    }

    // Calculate offline streak info using weekly logic
    const goals = await databaseService.getUserGoals();
    const weekProgress = await this.getWeekProgress();
    const workouts = await databaseService.getWorkouts();

    if (!goals) {
      return {
        currentStreak: 0,
        bestStreak: 0,
        totalWeeksCompleted: 0,
        isOnTrack: false,
        daysUntilDeadline: 7,
        lastWorkoutDate: ''
      };
    }

    const now = new Date();
    const weekEnd = new Date(weekProgress.weekEndDate);
    const daysUntilDeadline = Math.ceil((weekEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Calculate consecutive weeks with goal met, starting from current week backwards
    const { currentStreak, totalWeeksCompleted } = this.calculateWeeklyStreak(workouts, goals.weeklyWorkoutGoal);

    return {
      currentStreak,
      bestStreak: Math.max(goals.bestStreak || 0, currentStreak),
      totalWeeksCompleted,
      isOnTrack: weekProgress.isCompleted,
      daysUntilDeadline: Math.max(0, daysUntilDeadline),
      lastWorkoutDate: goals?.lastWorkoutDate || ''
    };
  }

  // Helper function to calculate weekly streak
  private calculateWeeklyStreak(workouts: any[], weeklyWorkoutGoal: number): { currentStreak: number, totalWeeksCompleted: number } {
    console.log('[DEBUG] calculateWeeklyStreak called with:', {
      totalWorkouts: workouts.length,
      weeklyWorkoutGoal,
      workoutDates: workouts.map(w => w.date).slice(0, 10) // Show first 10 dates
    });

    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const currentMondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(currentWeekStart.getDate() + currentMondayOffset);
    currentWeekStart.setHours(0, 0, 0, 0);

    console.log('[DEBUG] Current week start:', currentWeekStart.toISOString());

    let currentStreak = 0;
    let totalWeeksCompleted = 0;
    let weekOffset = 0;
    let streakBroken = false;

    // Check current week and previous weeks for consecutive streak
    while (weekOffset < 52) {
      const weekStartCalc = new Date(currentWeekStart);
      weekStartCalc.setDate(currentWeekStart.getDate() - weekOffset * 7);

      const weekEndCalc = new Date(weekStartCalc);
      weekEndCalc.setDate(weekStartCalc.getDate() + 6);
      weekEndCalc.setHours(23, 59, 59, 999);

      // Count workouts in this week
      const workoutsInWeek = workouts.filter(workout => {
        const workoutDate = new Date(workout.date);
        return workoutDate >= weekStartCalc && workoutDate <= weekEndCalc;
      }).length;

      // Check if this is current week and it's incomplete
      const isCurrentWeek = weekOffset === 0;
      const weekIsComplete = now > weekEndCalc;

      console.log(`[DEBUG] Week ${weekOffset}: ${weekStartCalc.toDateString()} - ${weekEndCalc.toDateString()}`);
      console.log(`[DEBUG] Workouts in week: ${workoutsInWeek}/${weeklyWorkoutGoal}`);
      console.log(`[DEBUG] Is current week: ${isCurrentWeek}, Week complete: ${weekIsComplete}`);

      if (workoutsInWeek >= weeklyWorkoutGoal) {
        currentStreak++;
        totalWeeksCompleted++;
        console.log(`[DEBUG] Streak continues: ${currentStreak}`);
      } else if (isCurrentWeek && !weekIsComplete) {
        // Current week is incomplete, skip it for streak calculation but don't break
        console.log(`[DEBUG] Current week incomplete, skipping for streak but continuing...`);
        weekOffset++;
        continue;
      } else {
        console.log(`[DEBUG] Streak broken at week ${weekOffset}`);
        // Stop counting streak when we find a completed week that doesn't meet the goal
        break;
      }

      weekOffset++;

      // Safety check - only check recent weeks for debugging
      if (weekOffset > 10) break;
    }

    // Continue counting total weeks completed (non-consecutive)
    while (weekOffset < 52) {
      const weekStartCalc = new Date(currentWeekStart);
      weekStartCalc.setDate(currentWeekStart.getDate() - weekOffset * 7);

      const weekEndCalc = new Date(weekStartCalc);
      weekEndCalc.setDate(weekStartCalc.getDate() + 6);
      weekEndCalc.setHours(23, 59, 59, 999);

      const workoutsInWeek = workouts.filter(workout => {
        const workoutDate = new Date(workout.date);
        return workoutDate >= weekStartCalc && workoutDate <= weekEndCalc;
      }).length;

      if (workoutsInWeek >= weeklyWorkoutGoal) {
        totalWeeksCompleted++;
      }

      weekOffset++;

      // Safety check
      if (weekOffset > 52) break;
    }

    console.log('[DEBUG] Final results:', { currentStreak, totalWeeksCompleted });
    return { currentStreak, totalWeeksCompleted };
  }

  async updateStreak(): Promise<UserGoals> {
    const isOnline = await syncService.getNetworkStatus();
    const isAuthenticated = await isAuthenticatedUser();

    // Só tenta fazer requisição online se o usuário estiver autenticado
    if (isOnline && isAuthenticated) {
      try {
        const updatedGoals = await onlineGoalsApi.updateStreak();
        await databaseService.saveUserGoals(updatedGoals);
        return updatedGoals;
      } catch (error) {
        console.warn('Failed to update streak online, updating offline:', error);
      }
    }

    // Update streak offline using weekly logic
    const goals = await databaseService.getUserGoals();
    if (!goals) {
      throw new Error('No goals found');
    }

    const workouts = await databaseService.getWorkouts();
    const { currentStreak, totalWeeksCompleted } = this.calculateWeeklyStreak(workouts, goals.weeklyWorkoutGoal);

    // Get last workout date
    const lastWorkout = workouts
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const lastWorkoutDate = lastWorkout ? lastWorkout.date : goals.lastWorkoutDate;

    const updatedGoals = {
      ...goals,
      currentStreak,
      bestStreak: Math.max(goals.bestStreak || 0, currentStreak),
      totalWeeksCompleted,
      lastWorkoutDate: lastWorkoutDate || new Date().toISOString()
    };

    return await databaseService.updateUserGoals(updatedGoals);
  }
}

export const offlineWorkoutApi = new OfflineWorkoutApi();
export const offlineExerciseApi = new OfflineExerciseApi();
export const offlineGoalsApi = new OfflineGoalsApi();