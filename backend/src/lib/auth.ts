import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { JWTPayload } from '../types/auth';
import { JWT_SECRET } from './env';
import { prisma } from './prisma';
import type { PrismaClient } from '../generated/prisma';

// Access token curto + refresh token de 30d (cookie httpOnly). Frontend
// auto-renova em 401 via /auth/refresh.
const JWT_EXPIRES_IN = '1h';
const REFRESH_TOKEN_EXPIRES_IN_DAYS = 30;
const PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES = 60;

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateAccessToken(payload: JWTPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  static async createRefreshToken(userId: string): Promise<string> {
    const token = this.generateRefreshToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRES_IN_DAYS);

    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  static async validateRefreshToken(token: string): Promise<{ userId: string } | null> {
    try {
      const refreshToken = await prisma.refreshToken.findFirst({
        where: {
          token,
          isRevoked: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      return refreshToken ? { userId: refreshToken.userId } : null;
    } catch (error) {
      return null;
    }
  }

  static async revokeRefreshToken(token: string): Promise<void> {
    try {
      await prisma.refreshToken.updateMany({
        where: { token },
        data: { isRevoked: true },
      });
    } catch (error) {
      console.error('Error revoking refresh token:', error);
    }
  }

  static async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    try {
      await prisma.refreshToken.updateMany({
        where: { userId },
        data: { isRevoked: true },
      });
    } catch (error) {
      console.error('Error revoking user refresh tokens:', error);
    }
  }

  // Gera um token de reset de senha pro usuário. Persiste só o hash; o
  // plaintext é entregue ao chamador pra ser enviado por e-mail.
  static async createPasswordResetToken(userId: string): Promise<string> {
    const plaintext = crypto.randomBytes(32).toString('base64url');
    const tokenHash = crypto.createHash('sha256').update(plaintext).digest('hex');
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_TOKEN_EXPIRES_IN_MINUTES * 60 * 1000,
    );

    await prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return plaintext;
  }

  // Valida e marca como usado. Retorna userId em caso de sucesso, null caso
  // contrário (token inválido, expirado, ou já usado).
  static async consumePasswordResetToken(
    plaintext: string,
  ): Promise<{ userId: string } | null> {
    const tokenHash = crypto.createHash('sha256').update(plaintext).digest('hex');
    try {
      const result = await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'>) => {
        const record = await tx.passwordResetToken.findUnique({
          where: { tokenHash },
        });
        if (!record) return null;
        if (record.usedAt) return null;
        if (record.expiresAt.getTime() <= Date.now()) return null;

        await tx.passwordResetToken.update({
          where: { id: record.id },
          data: { usedAt: new Date() },
        });
        return { userId: record.userId };
      });
      return result;
    } catch (error) {
      console.error('Error consuming password reset token:', error);
      return null;
    }
  }

  static async cleanExpiredPasswordResetTokens(): Promise<void> {
    try {
      await prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { usedAt: { not: null } },
          ],
        },
      });
    } catch (error) {
      console.error('Error cleaning expired password reset tokens:', error);
    }
  }

  static async cleanExpiredTokens(): Promise<void> {
    try {
      await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { isRevoked: true },
          ],
        },
      });
    } catch (error) {
      console.error('Error cleaning expired tokens:', error);
    }
  }

  static verifyAccessToken(token: string): JWTPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as JWTPayload;
    } catch (error) {
      return null;
    }
  }

  static generateToken(payload: JWTPayload): string {
    return this.generateAccessToken(payload);
  }

  static verifyToken(token: string): JWTPayload | null {
    return this.verifyAccessToken(token);
  }
}