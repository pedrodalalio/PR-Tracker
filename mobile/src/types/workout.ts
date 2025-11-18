export type WorkoutType = 'upper' | 'lower' | 'cardio';
export type WeekDay = 'segunda' | 'terça' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';

// Workout Schedule:
// Monday: Upper Body
// Tuesday: Legs
// Wednesday: Cardio
// Thursday: Upper Body
// Friday: Legs
// Weekend: Cardio

// Daily Rules:
// - Only one workout per day EXCEPT cardio
// - Upper + Cardio = OK
// - Legs + Cardio = OK
// - Upper + Legs = NOT ALLOWED

export interface Exercise {
  id: string;
  name: string;
  category: 'Superiores' | 'Inferiores' | 'Cardio';
  muscleGroups: string[];
}

export interface Set {
  id: string;
  reps: number;
  weight: number;
  duration?: number; // for cardio exercises (in seconds)
  distance?: number; // for runs (in meters)
  pace?: number; // calculated pace (minutes per kilometer)
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  sets: Set[];
  notes?: string;
}

export interface Workout {
  id: string;
  name: string;
  date: string; // ISO date string
  workoutType: WorkoutType;
  dayOfWeek: WeekDay;
  startTime?: string; // ISO date string
  endTime?: string; // ISO date string
  exercises: WorkoutExercise[];
  notes?: string;
}

export interface CreateWorkoutRequest {
  name: string;
  date: string;
  workoutType: WorkoutType;
  dayOfWeek: WeekDay;
  exercises?: Omit<WorkoutExercise, 'id'>[];
  notes?: string;
}

export interface UpdateWorkoutRequest {
  name?: string;
  exercises?: WorkoutExercise[];
  notes?: string;
  endTime?: string;
}

export interface CreateExerciseRequest {
  name: string;
  category: Exercise['category'];
  muscleGroups: string[];
}

export interface UserGoals {
  id: string;
  weeklyWorkoutGoal: number; // Target workouts per week (e.g., 3, 5)
  currentStreak: number; // Current streak in days
  bestStreak: number; // Best streak achieved in days
  totalWeeksCompleted: number; // Total weeks where goal was met
  lastWorkoutDate: string; // ISO date string of last workout
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalsRequest {
  weeklyWorkoutGoal: number;
}

export interface UpdateGoalsRequest {
  weeklyWorkoutGoal?: number;
}

export interface WeeklyProgress {
  weekStartDate: string; // ISO date string (Monday of the week)
  weekEndDate: string; // ISO date string (Sunday of the week)
  targetWorkouts: number;
  completedWorkouts: number;
  isCompleted: boolean;
  workouts: Workout[];
}

export interface StreakInfo {
  currentStreak: number; // Current daily streak
  bestStreak: number; // Best daily streak achieved
  totalWeeksCompleted: number;
  isOnTrack: boolean; // Is current week on track to meet goal
  daysUntilDeadline: number; // Days left in current week
  lastWorkoutDate: string; // Date of last workout
}