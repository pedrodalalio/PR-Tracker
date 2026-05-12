export type WorkoutType = 'upper' | 'lower' | 'cardio';
export type WeekDay = 'segunda' | 'terça' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';

export interface Exercise {
  id: string;
  name: string;
  category: 'Upper' | 'Lower' | 'Cardio';
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
  templateId?: string | null;
}

export interface UpdateWorkoutRequest {
  name?: string;
  date?: string;
  workoutType?: WorkoutType;
  dayOfWeek?: WeekDay;
  exercises?: Omit<WorkoutExercise, "id">[];
  notes?: string;
  endTime?: string | null;
  templateId?: string | null;
}

export interface CreateExerciseRequest {
  name: string;
  category: Exercise['category'];
  muscleGroups: string[];
}

export interface UserGoals {
  id: string;
  weeklyWorkoutGoal: number; // Target workouts per week (e.g., 3, 5)
  targetDays: WeekDay[]; // Specific days the user plans to train (optional, can be empty)
  currentStreak: number; // Current streak in days
  bestStreak: number; // Best streak achieved in days
  totalWeeksCompleted: number; // Total weeks where goal was met
  lastWorkoutDate: string; // ISO date string of last workout
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalsRequest {
  weeklyWorkoutGoal: number;
  targetDays?: WeekDay[];
}

export interface UpdateGoalsRequest {
  weeklyWorkoutGoal?: number;
  targetDays?: WeekDay[];
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