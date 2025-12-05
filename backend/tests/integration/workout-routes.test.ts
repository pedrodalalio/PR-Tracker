import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import supertest from 'supertest'
import { createTestApp, mockPrisma } from '../setup/test-app'
import { mockWorkouts, mockExercises } from '../setup/test-database'

describe('Workout Routes Integration', () => {
  let app: any
  let request: supertest.SuperTest<supertest.Test>

  beforeEach(async () => {
    app = await createTestApp()
    request = supertest(app.server)

    // Reset mocks
    Object.values(mockPrisma).forEach(model => {
      Object.values(model as any).forEach((method: any) => method.mockReset?.())
    })

    // Mock global fetch for streak updates
    global.fetch = vi.fn().mockResolvedValue({ ok: true })
  })

  afterAll(async () => {
    await app?.close()
  })

  describe('GET /workouts', () => {
    it('should return workouts for authenticated user', async () => {
      const userWorkouts = [mockWorkouts.workout1]
      mockPrisma.workout.findMany.mockResolvedValue(userWorkouts)

      const response = await request
        .get('/workouts')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.workouts).toEqual(userWorkouts)
      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: {
          exercises: {
            include: {
              exercise: true,
              sets: true
            }
          }
        },
        orderBy: { date: 'desc' }
      })
    })

    it('should return 401 without token', async () => {
      const response = await request.get('/workouts')

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Unauthorized')
    })

    it('should handle database errors', async () => {
      mockPrisma.workout.findMany.mockRejectedValue(new Error('Database error'))

      const response = await request
        .get('/workouts')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to fetch workouts')
    })
  })

  describe('GET /workouts/:id', () => {
    it('should return specific workout', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(mockWorkouts.workout1)

      const response = await request
        .get('/workouts/workout-1')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(200)
      expect(response.body.workout).toEqual(mockWorkouts.workout1)
      expect(mockPrisma.workout.findUnique).toHaveBeenCalledWith({
        where: { id: 'workout-1', userId: 'user-123' },
        include: {
          exercises: {
            include: {
              exercise: true,
              sets: true
            }
          }
        }
      })
    })

    it('should return 404 if workout not found', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(null)

      const response = await request
        .get('/workouts/nonexistent')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Workout not found')
    })

    it('should return 401 without token', async () => {
      const response = await request.get('/workouts/workout-1')

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Unauthorized')
    })
  })

  describe('POST /workouts', () => {
    it('should create new workout', async () => {
      const newWorkout = {
        id: 'new-workout',
        userId: 'user-123',
        name: 'Evening Workout',
        date: '2024-01-01T00:00:00.000Z',
        workoutType: 'cardio',
        dayOfWeek: 'tuesday',
        exercises: []
      }

      mockPrisma.workout.create.mockResolvedValue(newWorkout)

      const response = await request
        .post('/workouts')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Evening Workout',
          date: '2024-01-01',
          workoutType: 'cardio',
          dayOfWeek: 'tuesday',
          exercises: []
        })

      expect(response.status).toBe(201)
      expect(response.body.workout).toEqual(newWorkout)
      expect(global.fetch).toHaveBeenCalled() // Streak update call
    })

    it('should create workout with exercises', async () => {
      const workoutWithExercises = {
        id: 'workout-with-ex',
        userId: 'user-123',
        name: 'Full Body',
        date: '2024-01-01T00:00:00.000Z',
        workoutType: 'strength',
        dayOfWeek: 'monday',
        exercises: [{
          exerciseId: 'ex-1',
          notes: 'Great form',
          sets: [{ reps: 10, weight: 50 }]
        }]
      }

      mockPrisma.workout.create.mockResolvedValue(workoutWithExercises)

      const response = await request
        .post('/workouts')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Full Body',
          date: '2024-01-01',
          workoutType: 'strength',
          dayOfWeek: 'monday',
          exercises: [{
            exerciseId: 'ex-1',
            notes: 'Great form',
            sets: [{ reps: 10, weight: 50 }]
          }]
        })

      expect(response.status).toBe(201)
      expect(response.body.workout).toEqual(workoutWithExercises)
    })

    it('should return 401 without token', async () => {
      const response = await request
        .post('/workouts')
        .send({
          name: 'Test Workout',
          date: '2024-01-01',
          workoutType: 'strength'
        })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Unauthorized')
    })

    it('should handle creation errors', async () => {
      mockPrisma.workout.create.mockRejectedValue(new Error('Database error'))

      const response = await request
        .post('/workouts')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Test Workout',
          date: '2024-01-01',
          workoutType: 'strength'
        })

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to create workout')
    })
  })

  describe('PUT /workouts/:id', () => {
    it('should update workout', async () => {
      const updatedWorkout = {
        ...mockWorkouts.workout1,
        name: 'Updated Workout',
        notes: 'Modified notes'
      }

      mockPrisma.workout.update.mockResolvedValue(updatedWorkout)

      const response = await request
        .put('/workouts/workout-1')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Workout',
          notes: 'Modified notes'
        })

      expect(response.status).toBe(200)
      expect(response.body.workout).toEqual(updatedWorkout)
      expect(mockPrisma.workout.update).toHaveBeenCalledWith({
        where: { id: 'workout-1', userId: 'user-123' },
        data: {
          name: 'Updated Workout',
          notes: 'Modified notes'
        },
        include: {
          exercises: {
            include: {
              exercise: true,
              sets: true
            }
          }
        }
      })
    })

    it('should return 404 if workout not found', async () => {
      const error = new Error('Record not found')
      ;(error as any).code = 'P2025'
      mockPrisma.workout.update.mockRejectedValue(error)

      const response = await request
        .put('/workouts/nonexistent')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated' })

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Workout not found')
    })

    it('should return 401 without token', async () => {
      const response = await request
        .put('/workouts/workout-1')
        .send({ name: 'Updated' })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Unauthorized')
    })
  })

  describe('DELETE /workouts/:id', () => {
    it('should delete workout', async () => {
      mockPrisma.workout.delete.mockResolvedValue(mockWorkouts.workout1)

      const response = await request
        .delete('/workouts/workout-1')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(204)
      expect(mockPrisma.workout.delete).toHaveBeenCalledWith({
        where: { id: 'workout-1', userId: 'user-123' }
      })
    })

    it('should return 404 if workout not found', async () => {
      const error = new Error('Record not found')
      ;(error as any).code = 'P2025'
      mockPrisma.workout.delete.mockRejectedValue(error)

      const response = await request
        .delete('/workouts/nonexistent')
        .set('Authorization', 'Bearer valid-token')

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Workout not found')
    })

    it('should return 401 without token', async () => {
      const response = await request.delete('/workouts/workout-1')

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Unauthorized')
    })
  })

  describe('POST /workouts/:workoutId/exercises', () => {
    it('should add exercise to workout', async () => {
      const mockWorkout = { id: 'workout-1', userId: 'user-123' }
      const mockWorkoutExercise = {
        id: 'we-1',
        workoutId: 'workout-1',
        exerciseId: 'ex-1',
        exercise: mockExercises.pushUp,
        sets: [{ reps: 10, weight: 0 }]
      }

      mockPrisma.workout.findUnique.mockResolvedValue(mockWorkout)
      mockPrisma.exercise.findUnique.mockResolvedValue(mockExercises.pushUp)
      mockPrisma.workoutExercise.create.mockResolvedValue(mockWorkoutExercise)

      const response = await request
        .post('/workouts/workout-1/exercises')
        .set('Authorization', 'Bearer valid-token')
        .send({
          exerciseId: 'ex-1',
          sets: [{ reps: 10, weight: 0 }]
        })

      expect(response.status).toBe(200)
      expect(response.body.workoutExercise).toEqual(mockWorkoutExercise)
    })

    it('should return 404 if workout not found', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(null)

      const response = await request
        .post('/workouts/nonexistent/exercises')
        .set('Authorization', 'Bearer valid-token')
        .send({ exerciseId: 'ex-1' })

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Workout not found')
    })

    it('should return 404 if exercise not found', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue({ id: 'workout-1', userId: 'user-123' })
      mockPrisma.exercise.findUnique.mockResolvedValue(null)

      const response = await request
        .post('/workouts/workout-1/exercises')
        .set('Authorization', 'Bearer valid-token')
        .send({ exerciseId: 'nonexistent' })

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Exercise not found')
    })

    it('should return 401 without token', async () => {
      const response = await request
        .post('/workouts/workout-1/exercises')
        .send({ exerciseId: 'ex-1' })

      expect(response.status).toBe(401)
      expect(response.body.error).toBe('Unauthorized')
    })
  })
})