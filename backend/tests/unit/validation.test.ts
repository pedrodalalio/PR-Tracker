import { describe, it, expect } from 'vitest'
import { registerSchema, loginSchema } from '../../src/lib/validation'

describe('Validation Schemas', () => {
  describe('registerSchema', () => {
    it('should validate valid registration data', () => {
      const validData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      }

      const { error } = registerSchema.validate(validData)
      expect(error).toBeUndefined()
    })

    it('should reject invalid email', () => {
      const invalidData = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'password123'
      }

      const { error } = registerSchema.validate(invalidData)
      expect(error).toBeDefined()
      expect(error?.message).toContain('email')
    })

    it('should reject short password', () => {
      const invalidData = {
        username: 'testuser',
        email: 'test@example.com',
        password: '123'
      }

      const { error } = registerSchema.validate(invalidData)
      expect(error).toBeDefined()
    })

    it('should reject empty username', () => {
      const invalidData = {
        username: '',
        email: 'test@example.com',
        password: 'password123'
      }

      const { error } = registerSchema.validate(invalidData)
      expect(error).toBeDefined()
    })

    it('should reject missing fields', () => {
      const invalidData = {
        username: 'testuser'
      }

      const { error } = registerSchema.validate(invalidData)
      expect(error).toBeDefined()
    })
  })

  describe('loginSchema', () => {
    it('should validate valid login data with username', () => {
      const validData = {
        usernameOrEmail: 'testuser',
        password: 'password123'
      }

      const { error } = loginSchema.validate(validData)
      expect(error).toBeUndefined()
    })

    it('should validate valid login data with email', () => {
      const validData = {
        usernameOrEmail: 'test@example.com',
        password: 'password123'
      }

      const { error } = loginSchema.validate(validData)
      expect(error).toBeUndefined()
    })

    it('should reject empty usernameOrEmail', () => {
      const invalidData = {
        usernameOrEmail: '',
        password: 'password123'
      }

      const { error } = loginSchema.validate(invalidData)
      expect(error).toBeDefined()
    })

    it('should reject empty password', () => {
      const invalidData = {
        usernameOrEmail: 'testuser',
        password: ''
      }

      const { error } = loginSchema.validate(invalidData)
      expect(error).toBeDefined()
    })

    it('should reject missing fields', () => {
      const invalidData = {
        usernameOrEmail: 'testuser'
      }

      const { error } = loginSchema.validate(invalidData)
      expect(error).toBeDefined()
    })
  })
})