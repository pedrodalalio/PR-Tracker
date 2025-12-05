import Fastify from 'fastify'
import { vi } from 'vitest'
import { createMockPrisma } from './test-database'

// Mock global do Prisma
const mockPrisma = createMockPrisma()

// Mock do AuthService
const mockAuthService = {
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
  generateToken: vi.fn(),
  verifyToken: vi.fn(),
  createRefreshToken: vi.fn(),
  validateRefreshToken: vi.fn(),
  revokeRefreshToken: vi.fn(),
  revokeAllUserRefreshTokens: vi.fn(),
}

// Setup de mocks antes de importar as rotas
vi.mock('../../src/lib/prisma', () => ({
  prisma: mockPrisma,
}))

vi.mock('../../src/lib/auth', () => ({
  AuthService: mockAuthService,
}))

// Mock simples do middleware de autenticação
vi.mock('../../src/lib/middleware', () => ({
  authenticateToken: (request: any, reply: any, done: any) => {
    const authHeader = request.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized' })
    }

    const token = authHeader.substring(7)
    if (token === 'valid-token') {
      request.user = { userId: 'user-123', username: 'testuser', email: 'test@example.com' }
      done()
    } else {
      return reply.status(401).send({ error: 'Invalid token' })
    }
  }
}))

export async function createTestApp() {
  const app = Fastify({ logger: false })

  // Registra as rotas
  const { authRoutes } = await import('../../src/routes/auth')
  const { workoutRoutes } = await import('../../src/routes/workouts')
  const { exerciseRoutes } = await import('../../src/routes/exercises')

  app.register(authRoutes)
  app.register(workoutRoutes)
  app.register(exerciseRoutes)

  await app.ready()
  return app
}

export { mockPrisma, mockAuthService }