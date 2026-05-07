export const testUsers = {
  admin: {
    username: 'admin',
    password: 'admin123',
    email: 'admin@test.com'
  },
  guest: {
    username: 'guest',
    password: '',
    email: ''
  }
};

export const testWorkouts = {
  upperBody: {
    name: 'Upper Body Training',
    type: 'upper' as const,
    dayOfWeek: 'segunda' as const,
    exercises: [
      {
        name: 'Push-ups',
        category: 'Superiores' as const,
        sets: [
          { reps: 10, weight: 0 },
          { reps: 12, weight: 0 },
          { reps: 8, weight: 0 }
        ]
      },
      {
        name: 'Pull-ups',
        category: 'Superiores' as const,
        sets: [
          { reps: 5, weight: 0 },
          { reps: 6, weight: 0 },
          { reps: 4, weight: 0 }
        ]
      }
    ]
  },
  cardio: {
    name: 'Cardio Session',
    type: 'cardio' as const,
    dayOfWeek: 'quarta' as const,
    exercises: [
      {
        name: 'Running',
        category: 'Cardio' as const,
        sets: [
          { duration: 1800, distance: 5000, pace: 6 } // 30 min, 5km, 6 min/km
        ]
      }
    ]
  }
};

export const testExercises = [
  {
    id: 'exercise_1',
    name: 'Push-ups',
    category: 'Superiores' as const,
    muscleGroups: ['Chest', 'Shoulders', 'Triceps']
  },
  {
    id: 'exercise_2',
    name: 'Pull-ups',
    category: 'Superiores' as const,
    muscleGroups: ['Back', 'Biceps']
  },
  {
    id: 'exercise_3',
    name: 'Squats',
    category: 'Inferiores' as const,
    muscleGroups: ['Quadriceps', 'Glutes']
  },
  {
    id: 'exercise_4',
    name: 'Running',
    category: 'Cardio' as const,
    muscleGroups: ['Legs', 'Cardiovascular']
  }
];

export const apiEndpoints = {
  health: '/health',
  login: '/auth/login',
  logout: '/auth/logout',
  workouts: '/workouts',
  exercises: '/exercises',
  goals: '/goals'
};