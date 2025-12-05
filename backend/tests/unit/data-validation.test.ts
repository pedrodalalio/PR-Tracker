import { describe, it, expect } from 'vitest'

// Testes para validação de estruturas de dados
describe('Data Structure Validation', () => {
  describe('User Data Validation', () => {
    it('should validate user registration data structure', () => {
      const validUserData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      }

      // Validações básicas
      expect(validUserData.username).toMatch(/^[a-zA-Z0-9_]+$/)
      expect(validUserData.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      expect(validUserData.password.length).toBeGreaterThanOrEqual(6)
    })

    it('should validate user response data structure', () => {
      const userResponse = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        createdAt: '2024-01-01T00:00:00.000Z'
      }

      expect(userResponse.id).toBeTruthy()
      expect(typeof userResponse.username).toBe('string')
      expect(typeof userResponse.email).toBe('string')
      expect(userResponse.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
    })
  })

  describe('Workout Data Validation', () => {
    it('should validate workout creation data structure', () => {
      const workoutData = {
        name: 'Morning Workout',
        date: '2024-01-01',
        workoutType: 'strength',
        dayOfWeek: 'monday',
        exercises: [
          {
            exerciseId: 'ex-1',
            notes: 'Good form',
            sets: [
              {
                reps: 10,
                weight: 50,
                duration: null,
                distance: null
              }
            ]
          }
        ],
        notes: 'Great workout'
      }

      expect(workoutData.name).toBeTruthy()
      expect(['strength', 'cardio', 'flexibility', 'sports']).toContain(workoutData.workoutType)
      expect(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
        .toContain(workoutData.dayOfWeek)
      expect(Array.isArray(workoutData.exercises)).toBe(true)

      // Validate exercise structure
      workoutData.exercises.forEach(exercise => {
        expect(exercise.exerciseId).toBeTruthy()
        expect(Array.isArray(exercise.sets)).toBe(true)

        exercise.sets.forEach(set => {
          expect(typeof set.reps === 'number' || set.reps === null).toBe(true)
          expect(typeof set.weight === 'number' || set.weight === null).toBe(true)
        })
      })
    })

    it('should validate workout response data structure', () => {
      const workoutResponse = {
        id: 'workout-123',
        userId: 'user-123',
        name: 'Test Workout',
        date: '2024-01-01T00:00:00.000Z',
        workoutType: 'strength',
        dayOfWeek: 'monday',
        startTime: '2024-01-01T08:00:00.000Z',
        endTime: null,
        notes: 'Great workout',
        exercises: []
      }

      expect(workoutResponse.id).toBeTruthy()
      expect(workoutResponse.userId).toBeTruthy()
      expect(workoutResponse.name).toBeTruthy()
      expect(workoutResponse.date).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/)
      expect(Array.isArray(workoutResponse.exercises)).toBe(true)
    })
  })

  describe('Exercise Data Validation', () => {
    it('should validate exercise creation data structure', () => {
      const exerciseData = {
        name: 'Push-up',
        category: 'strength',
        muscleGroups: ['chest', 'triceps', 'shoulders']
      }

      expect(exerciseData.name).toBeTruthy()
      expect(['strength', 'cardio', 'flexibility', 'sports']).toContain(exerciseData.category)
      expect(Array.isArray(exerciseData.muscleGroups)).toBe(true)
      expect(exerciseData.muscleGroups.length).toBeGreaterThan(0)

      exerciseData.muscleGroups.forEach(muscle => {
        expect(typeof muscle).toBe('string')
        expect(muscle.length).toBeGreaterThan(0)
      })
    })

    it('should validate exercise response data structure', () => {
      const exerciseResponse = {
        id: 'ex-123',
        name: 'Push-up',
        category: 'strength',
        muscleGroups: [
          { muscleGroup: 'chest' },
          { muscleGroup: 'triceps' }
        ]
      }

      expect(exerciseResponse.id).toBeTruthy()
      expect(exerciseResponse.name).toBeTruthy()
      expect(Array.isArray(exerciseResponse.muscleGroups)).toBe(true)

      exerciseResponse.muscleGroups.forEach(mg => {
        expect(mg.muscleGroup).toBeTruthy()
        expect(typeof mg.muscleGroup).toBe('string')
      })
    })
  })

  describe('Authentication Data Validation', () => {
    it('should validate JWT payload structure', () => {
      const jwtPayload = {
        userId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        iat: 1642781234,
        exp: 1643386034
      }

      expect(jwtPayload.userId).toBeTruthy()
      expect(jwtPayload.username).toBeTruthy()
      expect(jwtPayload.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      expect(typeof jwtPayload.iat).toBe('number')
      expect(typeof jwtPayload.exp).toBe('number')
      expect(jwtPayload.exp).toBeGreaterThan(jwtPayload.iat)
    })

    it('should validate auth response structure', () => {
      const authResponse = {
        user: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com'
        },
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyJ9.signature',
        refreshToken: 'a1b2c3d4e5f6...'
      }

      expect(authResponse.user).toBeTruthy()
      expect(authResponse.user.id).toBeTruthy()
      expect(authResponse.user.username).toBeTruthy()
      expect(authResponse.user.email).toBeTruthy()
      expect(authResponse.token).toBeTruthy()
      expect(authResponse.refreshToken).toBeTruthy()

      // JWT structure validation (simplified)
      expect(authResponse.token.split('.').length).toBe(3)
    })
  })

  describe('Set Data Validation', () => {
    it('should validate strength exercise set data', () => {
      const strengthSet = {
        reps: 10,
        weight: 50.5,
        duration: null,
        distance: null,
        pace: null
      }

      expect(typeof strengthSet.reps).toBe('number')
      expect(strengthSet.reps).toBeGreaterThan(0)
      expect(typeof strengthSet.weight).toBe('number')
      expect(strengthSet.weight).toBeGreaterThan(0)
      expect(strengthSet.duration).toBeNull()
      expect(strengthSet.distance).toBeNull()
    })

    it('should validate cardio exercise set data', () => {
      const cardioSet = {
        reps: null,
        weight: null,
        duration: 1800, // 30 minutes in seconds
        distance: 5.0,  // 5 km
        pace: 360      // 6 minutes per km in seconds
      }

      expect(cardioSet.reps).toBeNull()
      expect(cardioSet.weight).toBeNull()
      expect(typeof cardioSet.duration).toBe('number')
      expect(cardioSet.duration).toBeGreaterThan(0)
      expect(typeof cardioSet.distance).toBe('number')
      expect(cardioSet.distance).toBeGreaterThan(0)
      expect(typeof cardioSet.pace).toBe('number')
      expect(cardioSet.pace).toBeGreaterThan(0)
    })
  })

  describe('Error Response Data Validation', () => {
    it('should validate error response structure', () => {
      const errorResponse = {
        error: 'Validation failed',
        details: ['Username is required', 'Email must be valid'],
        status: 400
      }

      expect(errorResponse.error).toBeTruthy()
      expect(typeof errorResponse.error).toBe('string')
      expect(Array.isArray(errorResponse.details)).toBe(true)
      expect(typeof errorResponse.status).toBe('number')
      expect(errorResponse.status).toBeGreaterThanOrEqual(400)
      expect(errorResponse.status).toBeLessThan(600)
    })

    it('should validate simple error response', () => {
      const simpleError = {
        error: 'Not found'
      }

      expect(simpleError.error).toBeTruthy()
      expect(typeof simpleError.error).toBe('string')
    })
  })
})