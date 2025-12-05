import { describe, it, expect, vi, beforeEach } from 'vitest'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// Mock das dependências ANTES de importar
vi.mock('jsonwebtoken')
vi.mock('bcryptjs')
vi.mock('crypto')

import { AuthUtils } from '../../src/lib/auth-utils'

describe('AuthUtils', () => {
  const mockJwt = jwt as any
  const mockBcrypt = bcrypt as any
  const mockCrypto = crypto as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('hashPassword', () => {
    it('should hash a password correctly', async () => {
      const password = 'testpass123'
      const hashedPassword = 'hashed_password'

      mockBcrypt.hash.mockResolvedValue(hashedPassword)

      const result = await AuthUtils.hashPassword(password)

      expect(mockBcrypt.hash).toHaveBeenCalledWith(password, 12)
      expect(result).toBe(hashedPassword)
    })

    it('should throw error if hashing fails', async () => {
      const password = 'testpass123'
      const error = new Error('Hashing failed')

      mockBcrypt.hash.mockRejectedValue(error)

      await expect(AuthUtils.hashPassword(password)).rejects.toThrow('Hashing failed')
    })
  })

  describe('comparePassword', () => {
    it('should return true for matching passwords', async () => {
      const password = 'testpass123'
      const hash = 'hashed_password'

      mockBcrypt.compare.mockResolvedValue(true)

      const result = await AuthUtils.comparePassword(password, hash)

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hash)
      expect(result).toBe(true)
    })

    it('should return false for non-matching passwords', async () => {
      const password = 'testpass123'
      const hash = 'hashed_password'

      mockBcrypt.compare.mockResolvedValue(false)

      const result = await AuthUtils.comparePassword(password, hash)

      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hash)
      expect(result).toBe(false)
    })
  })

  describe('generateAccessToken', () => {
    it('should generate a JWT token', () => {
      const payload = {
        userId: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      }
      const token = 'generated_jwt_token'

      mockJwt.sign.mockReturnValue(token)

      const result = AuthUtils.generateAccessToken(payload)

      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        'your-fallback-secret-change-in-production',
        { expiresIn: '7d' }
      )
      expect(result).toBe(token)
    })
  })

  describe('verifyAccessToken', () => {
    it('should verify a valid token', () => {
      const token = 'valid_jwt_token'
      const payload = {
        userId: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      }

      mockJwt.verify.mockReturnValue(payload)

      const result = AuthUtils.verifyAccessToken(token)

      expect(mockJwt.verify).toHaveBeenCalledWith(token, 'your-fallback-secret-change-in-production')
      expect(result).toEqual(payload)
    })

    it('should return null for invalid token', () => {
      const token = 'invalid_jwt_token'

      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token')
      })

      const result = AuthUtils.verifyAccessToken(token)

      expect(mockJwt.verify).toHaveBeenCalledWith(token, 'your-fallback-secret-change-in-production')
      expect(result).toBe(null)
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate a random hex string', () => {
      const randomBytes = Buffer.from('random_bytes')
      const hexString = 'random_hex_string'

      mockCrypto.randomBytes.mockReturnValue(randomBytes)
      randomBytes.toString = vi.fn().mockReturnValue(hexString)

      const result = AuthUtils.generateRefreshToken()

      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(64)
      expect(randomBytes.toString).toHaveBeenCalledWith('hex')
      expect(result).toBe(hexString)
    })
  })

  describe('verifyToken (alias)', () => {
    it('should call verifyAccessToken', () => {
      const token = 'test_token'
      const payload = { userId: 'user123', username: 'test', email: 'test@example.com' }

      mockJwt.verify.mockReturnValue(payload)

      const result = AuthUtils.verifyToken(token)

      expect(mockJwt.verify).toHaveBeenCalledWith(token, 'your-fallback-secret-change-in-production')
      expect(result).toEqual(payload)
    })
  })

  describe('generateToken (alias)', () => {
    it('should call generateAccessToken', () => {
      const payload = {
        userId: 'user123',
        username: 'testuser',
        email: 'test@example.com'
      }
      const token = 'generated_jwt_token'

      mockJwt.sign.mockReturnValue(token)

      const result = AuthUtils.generateToken(payload)

      expect(mockJwt.sign).toHaveBeenCalledWith(
        payload,
        'your-fallback-secret-change-in-production',
        { expiresIn: '7d' }
      )
      expect(result).toBe(token)
    })
  })
})