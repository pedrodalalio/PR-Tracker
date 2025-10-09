import { Exercise } from '../types/workout';

// In-memory storage for now (you can replace with database later)
export const exercises: Exercise[] = [
  // Upper Body Exercises
  {
    id: '1',
    name: 'Bench Press',
    category: 'Upper',
    muscleGroups: ['chest', 'triceps', 'shoulders']
  },
  {
    id: '2',
    name: 'Pull-ups',
    category: 'Upper',
    muscleGroups: ['back', 'biceps']
  },
  {
    id: '3',
    name: 'Overhead Press',
    category: 'Upper',
    muscleGroups: ['shoulders', 'triceps', 'core']
  },
  {
    id: '4',
    name: 'Barbell Row',
    category: 'Upper',
    muscleGroups: ['back', 'biceps']
  },
  {
    id: '5',
    name: 'Incline Dumbbell Press',
    category: 'Upper',
    muscleGroups: ['chest', 'shoulders', 'triceps']
  },
  {
    id: '6',
    name: 'Dips',
    category: 'Upper',
    muscleGroups: ['triceps', 'chest', 'shoulders']
  },
  {
    id: '7',
    name: 'Lat Pulldown',
    category: 'Upper',
    muscleGroups: ['back', 'biceps']
  },
  {
    id: '8',
    name: 'Bicep Curls',
    category: 'Upper',
    muscleGroups: ['biceps']
  },
  // Lower Body Exercises
  {
    id: '9',
    name: 'Squat',
    category: 'Lower',
    muscleGroups: ['quadriceps', 'glutes', 'hamstrings']
  },
  {
    id: '10',
    name: 'Deadlift',
    category: 'Lower',
    muscleGroups: ['hamstrings', 'glutes', 'back']
  },
  {
    id: '11',
    name: 'Romanian Deadlift',
    category: 'Lower',
    muscleGroups: ['hamstrings', 'glutes']
  },
  {
    id: '12',
    name: 'Bulgarian Split Squat',
    category: 'Lower',
    muscleGroups: ['quadriceps', 'glutes']
  },
  {
    id: '13',
    name: 'Hip Thrust',
    category: 'Lower',
    muscleGroups: ['glutes', 'hamstrings']
  },
  {
    id: '14',
    name: 'Leg Press',
    category: 'Lower',
    muscleGroups: ['quadriceps', 'glutes']
  },
  {
    id: '15',
    name: 'Calf Raises',
    category: 'Lower',
    muscleGroups: ['calves']
  },
  {
    id: '16',
    name: 'Walking Lunges',
    category: 'Lower',
    muscleGroups: ['quadriceps', 'glutes', 'hamstrings']
  },
  // Cardio Exercises
  {
    id: '17',
    name: 'Treadmill Running',
    category: 'Cardio',
    muscleGroups: ['cardiovascular', 'legs']
  },
  {
    id: '18',
    name: 'Stationary Bike',
    category: 'Cardio',
    muscleGroups: ['cardiovascular', 'legs']
  },
  {
    id: '19',
    name: 'Elliptical',
    category: 'Cardio',
    muscleGroups: ['cardiovascular', 'full body']
  },
  {
    id: '20',
    name: 'Rowing Machine',
    category: 'Cardio',
    muscleGroups: ['cardiovascular', 'back', 'legs']
  },
  {
    id: '21',
    name: 'Stair Climber',
    category: 'Cardio',
    muscleGroups: ['cardiovascular', 'legs', 'glutes']
  },
  {
    id: '22',
    name: 'Jump Rope',
    category: 'Cardio',
    muscleGroups: ['cardiovascular', 'legs', 'coordination']
  }
];

export const workouts: any[] = [];

let exerciseIdCounter = exercises.length + 1;
let workoutIdCounter = 1;

export const generateExerciseId = () => (exerciseIdCounter++).toString();
export const generateWorkoutId = () => (workoutIdCounter++).toString();
export const generateSetId = () => Math.random().toString(36).substr(2, 9);