import { vi } from 'vitest'

// Mock completo do Prisma Client para testes
export const createMockPrisma = () => ({
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  refreshToken: {
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
  },
  userGoals: {
    create: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  workout: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  workoutExercise: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  exercise: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  set: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
})

// Dados mock para testes
export const mockUsers = {
  user1: {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    password: '$2b$12$hashedpassword',
    createdAt: new Date('2024-01-01'),
  },
  user2: {
    id: 'user-456',
    username: 'otheruser',
    email: 'other@example.com',
    password: '$2b$12$hashedpassword2',
    createdAt: new Date('2024-01-02'),
  }
}

export const mockExercises = {
  pushUp: {
    id: 'ex-1',
    name: 'Push-up',
    category: 'strength',
    muscleGroups: [{ muscleGroup: 'chest' }, { muscleGroup: 'triceps' }]
  },
  squat: {
    id: 'ex-2',
    name: 'Squat',
    category: 'strength',
    muscleGroups: [{ muscleGroup: 'quadriceps' }, { muscleGroup: 'glutes' }]
  }
}

export const mockWorkouts = {
  workout1: {
    id: 'workout-1',
    userId: 'user-123',
    name: 'Morning Workout',
    date: '2024-01-01T00:00:00.000Z',
    workoutType: 'strength',
    dayOfWeek: 'monday',
    startTime: '2024-01-01T08:00:00.000Z',
    endTime: null,
    notes: 'Great workout!',
    exercises: []
  }
}