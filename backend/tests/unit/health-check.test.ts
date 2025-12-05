import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import Fastify from 'fastify'

describe('Health Check', () => {
  let app: any
  let request: supertest.SuperTest<supertest.Test>

  beforeAll(async () => {
    app = Fastify()

    // Registra a rota de health check simples
    app.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() }
    })

    await app.ready()
    request = supertest(app.server)
  })

  afterAll(async () => {
    await app.close()
  })

  it('should return health status', async () => {
    const response = await request.get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      status: 'ok',
      timestamp: expect.any(String)
    })
  })

  it('should return valid ISO timestamp', async () => {
    const response = await request.get('/health')

    expect(response.status).toBe(200)
    const timestamp = response.body.timestamp
    const date = new Date(timestamp)

    expect(date.toISOString()).toBe(timestamp)
    expect(date.getTime()).toBeGreaterThan(Date.now() - 5000) // Less than 5 seconds ago
  })
})