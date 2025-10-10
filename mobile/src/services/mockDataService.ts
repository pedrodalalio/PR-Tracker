import {
  Workout,
  Exercise,
  WorkoutExercise,
  Set,
  UserGoals,
  WeeklyProgress,
  StreakInfo,
  CreateWorkoutRequest,
  UpdateWorkoutRequest,
  CreateExerciseRequest,
  UpdateGoalsRequest,
} from '../types/workout';

export const mockExercises: Exercise[] = [
  // Upper Body - Chest
  { id: '1', name: 'Bench Press', category: 'Upper', muscleGroups: ['Chest', 'Triceps', 'Shoulders'] },
  { id: '2', name: 'Incline Dumbbell Press', category: 'Upper', muscleGroups: ['Chest', 'Shoulders', 'Triceps'] },
  { id: '3', name: 'Push-ups', category: 'Upper', muscleGroups: ['Chest', 'Triceps', 'Shoulders'] },
  { id: '4', name: 'Chest Fly', category: 'Upper', muscleGroups: ['Chest'] },
  { id: '5', name: 'Dips', category: 'Upper', muscleGroups: ['Chest', 'Triceps', 'Shoulders'] },

  // Upper Body - Back
  { id: '6', name: 'Pull-ups', category: 'Upper', muscleGroups: ['Back', 'Biceps'] },
  { id: '7', name: 'Lat Pulldown', category: 'Upper', muscleGroups: ['Back', 'Biceps'] },
  { id: '8', name: 'Barbell Rows', category: 'Upper', muscleGroups: ['Back', 'Biceps'] },
  { id: '9', name: 'T-Bar Rows', category: 'Upper', muscleGroups: ['Back', 'Biceps'] },
  { id: '10', name: 'Face Pulls', category: 'Upper', muscleGroups: ['Back', 'Shoulders'] },

  // Upper Body - Shoulders & Arms
  { id: '11', name: 'Overhead Press', category: 'Upper', muscleGroups: ['Shoulders', 'Triceps'] },
  { id: '12', name: 'Lateral Raises', category: 'Upper', muscleGroups: ['Shoulders'] },
  { id: '13', name: 'Rear Delt Flyes', category: 'Upper', muscleGroups: ['Shoulders', 'Back'] },
  { id: '14', name: 'Bicep Curls', category: 'Upper', muscleGroups: ['Biceps'] },
  { id: '15', name: 'Hammer Curls', category: 'Upper', muscleGroups: ['Biceps', 'Forearms'] },
  { id: '16', name: 'Tricep Extensions', category: 'Upper', muscleGroups: ['Triceps'] },
  { id: '17', name: 'Close-Grip Bench Press', category: 'Upper', muscleGroups: ['Triceps', 'Chest'] },

  // Lower Body - Quads & Glutes
  { id: '18', name: 'Back Squats', category: 'Lower', muscleGroups: ['Quadriceps', 'Glutes'] },
  { id: '19', name: 'Front Squats', category: 'Lower', muscleGroups: ['Quadriceps', 'Core'] },
  { id: '20', name: 'Bulgarian Split Squats', category: 'Lower', muscleGroups: ['Quadriceps', 'Glutes'] },
  { id: '21', name: 'Leg Press', category: 'Lower', muscleGroups: ['Quadriceps', 'Glutes'] },
  { id: '22', name: 'Leg Extensions', category: 'Lower', muscleGroups: ['Quadriceps'] },
  { id: '23', name: 'Walking Lunges', category: 'Lower', muscleGroups: ['Quadriceps', 'Glutes'] },
  { id: '24', name: 'Hip Thrusts', category: 'Lower', muscleGroups: ['Glutes', 'Hamstrings'] },

  // Lower Body - Hamstrings & Posterior Chain
  { id: '25', name: 'Deadlifts', category: 'Lower', muscleGroups: ['Hamstrings', 'Glutes', 'Back'] },
  { id: '26', name: 'Romanian Deadlifts', category: 'Lower', muscleGroups: ['Hamstrings', 'Glutes'] },
  { id: '27', name: 'Stiff Leg Deadlifts', category: 'Lower', muscleGroups: ['Hamstrings', 'Glutes'] },
  { id: '28', name: 'Leg Curls', category: 'Lower', muscleGroups: ['Hamstrings'] },
  { id: '29', name: 'Good Mornings', category: 'Lower', muscleGroups: ['Hamstrings', 'Glutes', 'Back'] },
  { id: '30', name: 'Calf Raises', category: 'Lower', muscleGroups: ['Calves'] },

  // Cardio & Conditioning
  { id: '31', name: 'Treadmill Running', category: 'Cardio', muscleGroups: ['Legs', 'Cardiovascular'] },
  { id: '32', name: 'Stationary Bike', category: 'Cardio', muscleGroups: ['Legs', 'Cardiovascular'] },
  { id: '33', name: 'Rowing Machine', category: 'Cardio', muscleGroups: ['Full Body', 'Cardiovascular'] },
  { id: '34', name: 'Elliptical', category: 'Cardio', muscleGroups: ['Full Body', 'Cardiovascular'] },
  { id: '35', name: 'StairMaster', category: 'Cardio', muscleGroups: ['Legs', 'Cardiovascular'] },
  { id: '36', name: 'Battle Ropes', category: 'Cardio', muscleGroups: ['Full Body', 'Cardiovascular'] },
  { id: '37', name: 'Burpees', category: 'Cardio', muscleGroups: ['Full Body', 'Cardiovascular'] },
  { id: '38', name: 'Mountain Climbers', category: 'Cardio', muscleGroups: ['Full Body', 'Cardiovascular'] },
  { id: '39', name: 'Jump Rope', category: 'Cardio', muscleGroups: ['Legs', 'Cardiovascular'] },
  { id: '40', name: 'High Knees', category: 'Cardio', muscleGroups: ['Legs', 'Cardiovascular'] },
];

const generateMockSets = (exerciseCategory: string, count: number = 3): Set[] => {
  const sets: Set[] = [];

  for (let i = 0; i < count; i++) {
    if (exerciseCategory === 'Cardio') {
      sets.push({
        id: `set-${Date.now()}-${i}`,
        reps: 0,
        weight: 0,
        duration: Math.floor(Math.random() * 600) + 300, // 5-15 minutes in seconds
        distance: Math.floor(Math.random() * 3000) + 1000, // 1-4km in meters
      });
    } else {
      sets.push({
        id: `set-${Date.now()}-${i}`,
        reps: Math.floor(Math.random() * 10) + 8, // 8-18 reps
        weight: Math.floor(Math.random() * 50) + 20, // 20-70 kg
      });
    }
  }

  return sets;
};

const createMockWorkoutExercise = (exercise: Exercise, index: number): WorkoutExercise => ({
  id: `we-${Date.now()}-${index}`,
  exerciseId: exercise.id,
  exercise,
  sets: generateMockSets(exercise.category),
  notes: Math.random() > 0.7 ? 'Felt great today!' : undefined,
});

// Helper function to generate progressive mock sets with realistic progression
const createProgressiveMockWorkoutExercise = (exercise: Exercise, index: number, weekOffset: number): WorkoutExercise => {
  const baseWeight = exercise.category === 'Cardio' ? 0 : Math.floor(Math.random() * 30) + 30;
  const progressionMultiplier = Math.max(0.8, 1 - (weekOffset * 0.02)); // Progressive overload over time

  const sets: Set[] = [];
  const setCount = exercise.category === 'Cardio' ? 1 : Math.floor(Math.random() * 2) + 3; // 3-4 sets for strength, 1 for cardio

  for (let i = 0; i < setCount; i++) {
    if (exercise.category === 'Cardio') {
      sets.push({
        id: `set-${Date.now()}-${index}-${i}`,
        reps: 0,
        weight: 0,
        duration: Math.floor((Math.random() * 900 + 1200) * progressionMultiplier), // 20-35 minutes
        distance: Math.floor((Math.random() * 4000 + 3000) * progressionMultiplier), // 3-7km
      });
    } else {
      sets.push({
        id: `set-${Date.now()}-${index}-${i}`,
        reps: Math.floor(Math.random() * 6 + 8), // 8-14 reps
        weight: Math.floor(baseWeight * progressionMultiplier + (Math.random() * 10 - 5)), // Progressive weight with variation
      });
    }
  }

  return {
    id: `we-${Date.now()}-${index}`,
    exerciseId: exercise.id,
    exercise,
    sets,
    notes: weekOffset < 2 ? (Math.random() > 0.7 ? 'Feeling strong today!' : undefined) : undefined,
  };
};

// Generate comprehensive workout history (12 weeks of data)
const generateMockWorkouts = (): Workout[] => {
  const workouts: Workout[] = [];
  const workoutTypes = ['upper', 'legs', 'cardio', 'full'];
  const workoutNames = {
    upper: ['Upper Body Power', 'Chest & Back', 'Arms & Shoulders', 'Pull Day', 'Push Day'],
    legs: ['Leg Day', 'Lower Body Strength', 'Glutes & Quads', 'Leg Power', 'Lower Focus'],
    cardio: ['Cardio Blast', 'HIIT Session', 'Endurance Training', 'Fat Burn', 'Conditioning'],
    full: ['Full Body', 'Total Body Workout', 'Functional Training', 'Circuit Training', 'Strength & Cardio']
  };

  // Generate 12 weeks of workout history (3-4 workouts per week)
  for (let week = 0; week < 12; week++) {
    const workoutsThisWeek = Math.floor(Math.random() * 2) + 3; // 3-4 workouts per week

    for (let workoutIndex = 0; workoutIndex < workoutsThisWeek; workoutIndex++) {
      const daysAgo = (week * 7) + (workoutIndex * 2) + Math.floor(Math.random() * 2);
      const workoutType = workoutTypes[Math.floor(Math.random() * workoutTypes.length)];
      const workoutNameOptions = workoutNames[workoutType as keyof typeof workoutNames];
      const workoutName = workoutNameOptions[Math.floor(Math.random() * workoutNameOptions.length)];

      const workoutDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const startTime = new Date(workoutDate.getTime() - 2 * 60 * 60 * 1000);
      const endTime = new Date(workoutDate.getTime() - (60 + Math.floor(Math.random() * 60)) * 60 * 1000);

      // Select exercises based on workout type
      let selectedExercises: Exercise[] = [];
      switch (workoutType) {
        case 'upper':
          selectedExercises = mockExercises.filter(e => e.category === 'Upper').slice(0, 4 + Math.floor(Math.random() * 2));
          break;
        case 'legs':
          selectedExercises = mockExercises.filter(e => e.category === 'Lower').slice(0, 4 + Math.floor(Math.random() * 2));
          break;
        case 'cardio':
          selectedExercises = mockExercises.filter(e => e.category === 'Cardio').slice(0, 2 + Math.floor(Math.random() * 2));
          break;
        case 'full':
          const upperEx = mockExercises.filter(e => e.category === 'Upper').slice(0, 2);
          const lowerEx = mockExercises.filter(e => e.category === 'Lower').slice(0, 2);
          const cardioEx = mockExercises.filter(e => e.category === 'Cardio').slice(0, 1);
          selectedExercises = [...upperEx, ...lowerEx, ...cardioEx];
          break;
      }

      const exercises = selectedExercises.map((exercise, idx) =>
        createProgressiveMockWorkoutExercise(exercise, idx, week)
      );

      workouts.push({
        id: `w-${week}-${workoutIndex}`,
        name: workoutName,
        date: workoutDate.toISOString(),
        workoutType: workoutType as any,
        dayOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][workoutDate.getDay()] as any,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        exercises,
        notes: week < 2 && Math.random() > 0.6 ?
          ['Great session!', 'Feeling stronger!', 'Tough but rewarding!', 'Personal best today!', 'Excellent form today!'][Math.floor(Math.random() * 5)] :
          undefined,
      });
    }
  }

  return workouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const mockWorkouts: Workout[] = generateMockWorkouts();

const mockGoals: UserGoals = {
  id: 'goals-1',
  weeklyWorkoutGoal: 4,
  currentStreak: 8,
  bestStreak: 15,
  totalWeeksCompleted: 22,
  lastWorkoutDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
};

export class MockDataService {
  private static instance: MockDataService;
  private workouts: Workout[] = [...mockWorkouts];
  private exercises: Exercise[] = [...mockExercises];
  private goals: UserGoals = { ...mockGoals };

  static getInstance(): MockDataService {
    if (!MockDataService.instance) {
      MockDataService.instance = new MockDataService();
    }
    return MockDataService.instance;
  }

  // Workout API methods
  async getWorkouts(): Promise<Workout[]> {
    await this.simulateDelay();
    return [...this.workouts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getWorkout(id: string): Promise<Workout> {
    await this.simulateDelay();
    const workout = this.workouts.find(w => w.id === id);
    if (!workout) {
      throw new Error('Workout not found');
    }
    return { ...workout };
  }

  async createWorkout(request: CreateWorkoutRequest): Promise<Workout> {
    await this.simulateDelay();
    const newWorkout: Workout = {
      id: `w-${Date.now()}`,
      ...request,
      startTime: new Date().toISOString(),
      exercises: request.exercises?.map((ex, index) => ({
        ...ex,
        id: `we-${Date.now()}-${index}`,
      })) || [],
    };
    this.workouts.push(newWorkout);
    return { ...newWorkout };
  }

  async updateWorkout(id: string, updates: UpdateWorkoutRequest): Promise<Workout> {
    await this.simulateDelay();
    const index = this.workouts.findIndex(w => w.id === id);
    if (index === -1) {
      throw new Error('Workout not found');
    }
    this.workouts[index] = { ...this.workouts[index], ...updates };
    return { ...this.workouts[index] };
  }

  async deleteWorkout(id: string): Promise<void> {
    await this.simulateDelay();
    this.workouts = this.workouts.filter(w => w.id !== id);
  }

  async addExerciseToWorkout(workoutId: string, exerciseId: string, sets: Set[] = []): Promise<WorkoutExercise> {
    await this.simulateDelay();
    const workout = this.workouts.find(w => w.id === workoutId);
    const exercise = this.exercises.find(e => e.id === exerciseId);

    if (!workout || !exercise) {
      throw new Error('Workout or exercise not found');
    }

    const workoutExercise: WorkoutExercise = {
      id: `we-${Date.now()}`,
      exerciseId,
      exercise: { ...exercise },
      sets: sets.length > 0 ? sets : generateMockSets(exercise.category, 1),
    };

    workout.exercises.push(workoutExercise);
    return { ...workoutExercise };
  }

  // Exercise API methods
  async getExercises(): Promise<Exercise[]> {
    await this.simulateDelay();
    return [...this.exercises];
  }

  async getExercise(id: string): Promise<Exercise> {
    await this.simulateDelay();
    const exercise = this.exercises.find(e => e.id === id);
    if (!exercise) {
      throw new Error('Exercise not found');
    }
    return { ...exercise };
  }

  async getExercisesByCategory(category: string): Promise<Exercise[]> {
    await this.simulateDelay();
    return this.exercises.filter(e => e.category === category);
  }

  async searchExercises(muscle?: string): Promise<Exercise[]> {
    await this.simulateDelay();
    if (!muscle) {
      return [...this.exercises];
    }
    return this.exercises.filter(e =>
      e.muscleGroups.some(mg => mg.toLowerCase().includes(muscle.toLowerCase()))
    );
  }

  async createExercise(request: CreateExerciseRequest): Promise<Exercise> {
    await this.simulateDelay();
    const newExercise: Exercise = {
      id: `e-${Date.now()}`,
      ...request,
    };
    this.exercises.push(newExercise);
    return { ...newExercise };
  }

  async updateExercise(id: string, updates: Partial<CreateExerciseRequest>): Promise<Exercise> {
    await this.simulateDelay();
    const index = this.exercises.findIndex(e => e.id === id);
    if (index === -1) {
      throw new Error('Exercise not found');
    }
    this.exercises[index] = { ...this.exercises[index], ...updates };
    return { ...this.exercises[index] };
  }

  async deleteExercise(id: string): Promise<void> {
    await this.simulateDelay();
    this.exercises = this.exercises.filter(e => e.id !== id);
  }

  // Goals API methods
  async getGoals(): Promise<UserGoals> {
    await this.simulateDelay();
    return { ...this.goals };
  }

  async updateGoals(updates: UpdateGoalsRequest): Promise<UserGoals> {
    await this.simulateDelay();
    this.goals = { ...this.goals, ...updates, updatedAt: new Date().toISOString() };
    return { ...this.goals };
  }

  async getWeekProgress(): Promise<WeeklyProgress> {
    await this.simulateDelay();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday

    const weekWorkouts = this.workouts.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate >= weekStart && workoutDate <= weekEnd;
    });

    return {
      weekStartDate: weekStart.toISOString(),
      weekEndDate: weekEnd.toISOString(),
      targetWorkouts: this.goals.weeklyWorkoutGoal,
      completedWorkouts: weekWorkouts.length,
      isCompleted: weekWorkouts.length >= this.goals.weeklyWorkoutGoal,
      workouts: weekWorkouts,
    };
  }

  async getStreakInfo(): Promise<StreakInfo> {
    await this.simulateDelay();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday

    const weekWorkouts = this.workouts.filter(w => {
      const workoutDate = new Date(w.date);
      return workoutDate >= weekStart && workoutDate <= weekEnd;
    });

    return {
      currentStreak: this.goals.currentStreak,
      bestStreak: this.goals.bestStreak,
      totalWeeksCompleted: this.goals.totalWeeksCompleted,
      isOnTrack: weekWorkouts.length >= this.goals.weeklyWorkoutGoal,
      daysUntilDeadline: Math.ceil((weekEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      lastWorkoutDate: this.goals.lastWorkoutDate,
    };
  }

  async updateStreak(): Promise<UserGoals> {
    await this.simulateDelay();
    this.goals = {
      ...this.goals,
      currentStreak: this.goals.currentStreak + 1,
      bestStreak: Math.max(this.goals.bestStreak, this.goals.currentStreak + 1),
      lastWorkoutDate: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return { ...this.goals };
  }

  async resetToDefaults(): Promise<void> {
    console.log('MockDataService: Resetting to default state');
    this.workouts = [...generateMockWorkouts()];
    this.exercises = [...mockExercises];
    this.goals = { ...mockGoals };
  }

  private async simulateDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
  }
}