import { databaseService } from './database';
import { syncService } from './syncService';
import { workoutApi as onlineWorkoutApi, exerciseApi as onlineExerciseApi, goalsApi as onlineGoalsApi } from './api';
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

class OfflineWorkoutApi {
  async getWorkouts(): Promise<Workout[]> {
    const isOnline = await syncService.getNetworkStatus();

    if (isOnline) {
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

    if (isOnline) {
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

    if (isOnline) {
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
      throw new Error('No goals found');
    }
    return localGoals;
  }

  async updateGoals(updates: UpdateGoalsRequest): Promise<UserGoals> {
    const isOnline = await syncService.getNetworkStatus();

    if (isOnline) {
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

    if (isOnline) {
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

    if (isOnline) {
      try {
        return await onlineGoalsApi.getStreakInfo();
      } catch (error) {
        console.warn('Failed to fetch streak info online, calculating offline:', error);
      }
    }

    // Calculate offline streak info
    const goals = await databaseService.getUserGoals();
    const weekProgress = await this.getWeekProgress();

    const now = new Date();
    const weekEnd = new Date(weekProgress.weekEndDate);
    const daysUntilDeadline = Math.ceil((weekEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      currentStreak: goals?.currentStreak || 0,
      bestStreak: goals?.bestStreak || 0,
      totalWeeksCompleted: goals?.totalWeeksCompleted || 0,
      isOnTrack: weekProgress.isCompleted,
      daysUntilDeadline: Math.max(0, daysUntilDeadline),
      lastWorkoutDate: goals?.lastWorkoutDate || ''
    };
  }

  async updateStreak(): Promise<UserGoals> {
    const isOnline = await syncService.getNetworkStatus();

    if (isOnline) {
      try {
        const updatedGoals = await onlineGoalsApi.updateStreak();
        await databaseService.saveUserGoals(updatedGoals);
        return updatedGoals;
      } catch (error) {
        console.warn('Failed to update streak online, updating offline:', error);
      }
    }

    // Update streak offline
    const goals = await databaseService.getUserGoals();
    if (!goals) {
      throw new Error('No goals found');
    }

    const today = new Date().toISOString().split('T')[0];
    const lastWorkoutDate = goals.lastWorkoutDate.split('T')[0];

    let currentStreak = goals.currentStreak;
    if (lastWorkoutDate !== today) {
      currentStreak += 1;
    }

    const updatedGoals = {
      ...goals,
      currentStreak,
      bestStreak: Math.max(goals.bestStreak, currentStreak),
      lastWorkoutDate: new Date().toISOString()
    };

    return await databaseService.updateUserGoals(updatedGoals);
  }
}

export const offlineWorkoutApi = new OfflineWorkoutApi();
export const offlineExerciseApi = new OfflineExerciseApi();
export const offlineGoalsApi = new OfflineGoalsApi();