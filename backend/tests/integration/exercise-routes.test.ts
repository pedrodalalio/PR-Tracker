import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import supertest from 'supertest'
import { createTestApp, mockPrisma } from '../setup/test-app'
import { mockExercises } from '../setup/test-database'

describe('Exercise Routes Integration', () => {
  let app: any
  let request: supertest.SuperTest<supertest.Test>

  beforeEach(async () => {
    app = await createTestApp()
    request = supertest(app.server)

    // Reset mocks
    Object.values(mockPrisma).forEach(model => {
      Object.values(model as any).forEach((method: any) => method.mockReset?.())
    })
  })

  afterAll(async () => {
    await app?.close()
  })

  describe('GET /exercises', () => {
    it('should return all exercises', async () => {
      const exercises = [mockExercises.pushUp, mockExercises.squat]
      mockPrisma.exercise.findMany.mockResolvedValue(exercises)

      const response = await request.get('/exercises')

      expect(response.status).toBe(200)
      expect(response.body.exercises).toEqual(exercises)
      expect(mockPrisma.exercise.findMany).toHaveBeenCalledWith({
        include: { muscleGroups: true },
        orderBy: { name: 'asc' }
      })
    })

    it('should handle database errors gracefully', async () => {
      mockPrisma.exercise.findMany.mockRejectedValue(new Error('Database error'))

      const response = await request.get('/exercises')

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to fetch exercises')
    })
  })

  describe('GET /exercises/:id', () => {
    it('should return specific exercise', async () => {
      mockPrisma.exercise.findUnique.mockResolvedValue(mockExercises.pushUp)

      const response = await request.get('/exercises/ex-1')

      expect(response.status).toBe(200)
      expect(response.body.exercise).toEqual(mockExercises.pushUp)
      expect(mockPrisma.exercise.findUnique).toHaveBeenCalledWith({
        where: { id: 'ex-1' },
        include: { muscleGroups: true }
      })
    })

    it('should return 404 if exercise not found', async () => {
      mockPrisma.exercise.findUnique.mockResolvedValue(null)

      const response = await request.get('/exercises/nonexistent')

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Exercise not found')
    })
  })

  describe('POST /exercises', () => {
    it('should create new exercise', async () => {
      const newExercise = {
        id: 'ex-new',
        name: 'Pull-up',
        category: 'strength',
        muscleGroups: [{ muscleGroup: 'lats' }, { muscleGroup: 'biceps' }]
      }

      mockPrisma.exercise.create.mockResolvedValue(newExercise)

      const response = await request
        .post('/exercises')
        .send({
          name: 'Pull-up',
          category: 'strength',
          muscleGroups: ['lats', 'biceps']
        })

      expect(response.status).toBe(201)
      expect(response.body.exercise).toEqual(newExercise)
      expect(mockPrisma.exercise.create).toHaveBeenCalledWith({
        data: {
          name: 'Pull-up',
          category: 'strength',
          muscleGroups: {
            create: [
              { muscleGroup: 'lats' },
              { muscleGroup: 'biceps' }
            ]
          }
        },
        include: { muscleGroups: true }
      })
    })

    it('should return 400 if exercise name already exists', async () => {
      const error = new Error('Unique constraint violation')
      ;(error as any).code = 'P2002'
      mockPrisma.exercise.create.mockRejectedValue(error)

      const response = await request
        .post('/exercises')
        .send({
          name: 'Push-up',
          category: 'strength',
          muscleGroups: ['chest']
        })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Exercise with this name already exists')
    })

    it('should handle general creation errors', async () => {
      mockPrisma.exercise.create.mockRejectedValue(new Error('Database error'))

      const response = await request
        .post('/exercises')
        .send({
          name: 'New Exercise',
          category: 'strength',
          muscleGroups: ['chest']
        })

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to create exercise')
    })
  })

  describe('PUT /exercises/:id', () => {
    it('should update exercise', async () => {
      const updatedExercise = {
        ...mockExercises.pushUp,
        name: 'Modified Push-up',
        muscleGroups: [{ muscleGroup: 'chest' }, { muscleGroup: 'shoulders' }]
      }

      mockPrisma.exercise.update.mockResolvedValue(updatedExercise)

      const response = await request
        .put('/exercises/ex-1')
        .send({
          name: 'Modified Push-up',
          muscleGroups: ['chest', 'shoulders']
        })

      expect(response.status).toBe(200)
      expect(response.body.exercise).toEqual(updatedExercise)
      expect(mockPrisma.exercise.update).toHaveBeenCalledWith({
        where: { id: 'ex-1' },
        data: {
          name: 'Modified Push-up',
          muscleGroups: {
            deleteMany: {},
            create: [
              { muscleGroup: 'chest' },
              { muscleGroup: 'shoulders' }
            ]
          }
        },
        include: { muscleGroups: true }
      })
    })

    it('should return 404 if exercise not found', async () => {
      const error = new Error('Record not found')
      ;(error as any).code = 'P2025'
      mockPrisma.exercise.update.mockRejectedValue(error)

      const response = await request
        .put('/exercises/nonexistent')
        .send({ name: 'Updated Exercise' })

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Exercise not found')
    })

    it('should return 400 if name conflicts', async () => {
      const error = new Error('Unique constraint violation')
      ;(error as any).code = 'P2002'
      mockPrisma.exercise.update.mockRejectedValue(error)

      const response = await request
        .put('/exercises/ex-1')
        .send({ name: 'Squat' })

      expect(response.status).toBe(400)
      expect(response.body.error).toBe('Exercise with this name already exists')
    })
  })

  describe('DELETE /exercises/:id', () => {
    it('should delete exercise', async () => {
      mockPrisma.exercise.delete.mockResolvedValue(mockExercises.pushUp)

      const response = await request.delete('/exercises/ex-1')

      expect(response.status).toBe(204)
      expect(mockPrisma.exercise.delete).toHaveBeenCalledWith({
        where: { id: 'ex-1' }
      })
    })

    it('should return 404 if exercise not found', async () => {
      const error = new Error('Record not found')
      ;(error as any).code = 'P2025'
      mockPrisma.exercise.delete.mockRejectedValue(error)

      const response = await request.delete('/exercises/nonexistent')

      expect(response.status).toBe(404)
      expect(response.body.error).toBe('Exercise not found')
    })
  })

  describe('GET /exercises/category/:category', () => {
    it('should return exercises by category', async () => {
      const strengthExercises = [mockExercises.pushUp, mockExercises.squat]
      mockPrisma.exercise.findMany.mockResolvedValue(strengthExercises)

      const response = await request.get('/exercises/category/strength')

      expect(response.status).toBe(200)
      expect(response.body.exercises).toEqual(strengthExercises)
      expect(mockPrisma.exercise.findMany).toHaveBeenCalledWith({
        where: { category: 'strength' },
        include: { muscleGroups: true },
        orderBy: { name: 'asc' }
      })
    })

    it('should handle errors in category search', async () => {
      mockPrisma.exercise.findMany.mockRejectedValue(new Error('Database error'))

      const response = await request.get('/exercises/category/cardio')

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to fetch exercises')
    })
  })

  describe('GET /exercises/search', () => {
    it('should search exercises by muscle group', async () => {
      const chestExercises = [mockExercises.pushUp]
      mockPrisma.exercise.findMany.mockResolvedValue(chestExercises)

      const response = await request
        .get('/exercises/search')
        .query({ muscle: 'chest' })

      expect(response.status).toBe(200)
      expect(response.body.exercises).toEqual(chestExercises)
      expect(mockPrisma.exercise.findMany).toHaveBeenCalledWith({
        where: {
          muscleGroups: {
            some: {
              muscleGroup: { contains: 'chest' }
            }
          }
        },
        include: { muscleGroups: true },
        orderBy: { name: 'asc' }
      })
    })

    it('should return all exercises when no muscle parameter', async () => {
      const allExercises = [mockExercises.pushUp, mockExercises.squat]
      mockPrisma.exercise.findMany.mockResolvedValue(allExercises)

      const response = await request.get('/exercises/search')

      expect(response.status).toBe(200)
      expect(response.body.exercises).toEqual(allExercises)
      expect(mockPrisma.exercise.findMany).toHaveBeenCalledWith({
        include: { muscleGroups: true },
        orderBy: { name: 'asc' }
      })
    })

    it('should handle search errors', async () => {
      mockPrisma.exercise.findMany.mockRejectedValue(new Error('Search error'))

      const response = await request
        .get('/exercises/search')
        .query({ muscle: 'chest' })

      expect(response.status).toBe(500)
      expect(response.body.error).toBe('Failed to search exercises')
    })
  })
})