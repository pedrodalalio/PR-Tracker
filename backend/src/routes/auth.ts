import { FastifyInstance } from "fastify";
import { PrismaClient } from "../generated/prisma";
import { AuthService } from "../lib/auth";
import { registerSchema, loginSchema } from "../lib/validation";
import { RegisterRequest, LoginRequest, AuthResponse, RefreshTokenRequest, RefreshTokenResponse } from "../types/auth";
import { authenticateToken } from "../lib/middleware";

const prisma = new PrismaClient();

export async function authRoutes(fastify: FastifyInstance) {
  // Register new user
  fastify.post<{ Body: RegisterRequest }>(
    "/auth/register",
    async (request, reply) => {
      try {
        // Validate request body
        const { error, value } = registerSchema.validate(request.body);
        if (error) {
          return reply.status(400).send({
            error: "Validation failed",
            details: error.details.map((d: any) => d.message),
          });
        }

        const { username, email, password } = value;

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            OR: [{ username }, { email }],
          },
        });

        if (existingUser) {
          const field =
            existingUser.username === username ? "username" : "email";
          return reply.status(409).send({
            error: `User with this ${field} already exists`,
          });
        }

        // Hash password
        const hashedPassword = await AuthService.hashPassword(password);

        // Create user
        const user = await prisma.user.create({
          data: {
            username,
            email,
            password: hashedPassword,
          },
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
          },
        });

        // Create default user goals
        await prisma.userGoals.create({
          data: {
            userId: user.id,
          },
        });

        // Generate tokens
        const token = AuthService.generateToken({
          userId: user.id,
          username: user.username,
          email: user.email,
        });
        const refreshToken = await AuthService.createRefreshToken(user.id);

        const response: AuthResponse = {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          token,
          refreshToken,
        };

        return reply.status(201).send(response);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Internal server error",
        });
      }
    },
  );

  // Login user
  fastify.post<{ Body: LoginRequest }>(
    "/auth/login",
    async (request, reply) => {
      try {
        // Validate request body
        const { error, value } = loginSchema.validate(request.body);
        if (error) {
          return reply.status(400).send({
            error: "Validation failed",
            details: error.details.map((d: any) => d.message),
          });
        }

        const { usernameOrEmail, password } = value;

        // Find user by username or email
        const user = await prisma.user.findFirst({
          where: {
            OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
          },
        });

        if (!user) {
          return reply.status(401).send({
            error: "Invalid credentials",
          });
        }

        // Verify password
        const isPasswordValid = await AuthService.comparePassword(
          password,
          user.password,
        );
        if (!isPasswordValid) {
          return reply.status(401).send({
            error: "Invalid credentials",
          });
        }

        // Generate tokens
        const token = AuthService.generateToken({
          userId: user.id,
          username: user.username,
          email: user.email,
        });
        const refreshToken = await AuthService.createRefreshToken(user.id);

        const response: AuthResponse = {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          token,
          refreshToken,
        };

        return reply.send(response);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Internal server error",
        });
      }
    },
  );

  // Get current user
  fastify.get(
    "/auth/me",
    {
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: request.user!.userId },
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
          },
        });

        if (!user) {
          return reply.status(404).send({
            error: "User not found",
          });
        }

        return reply.send({ user });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Internal server error",
        });
      }
    },
  );

  // Refresh access token
  fastify.post<{ Body: RefreshTokenRequest }>(
    "/auth/refresh",
    async (request, reply) => {
      try {
        const { refreshToken } = request.body;

        if (!refreshToken) {
          return reply.status(400).send({
            error: "Refresh token is required",
          });
        }

        const tokenValidation = await AuthService.validateRefreshToken(refreshToken);
        if (!tokenValidation) {
          return reply.status(401).send({
            error: "Invalid or expired refresh token",
          });
        }

        // Get user data
        const user = await prisma.user.findUnique({
          where: { id: tokenValidation.userId },
          select: {
            id: true,
            username: true,
            email: true,
          },
        });

        if (!user) {
          return reply.status(404).send({
            error: "User not found",
          });
        }

        // Revoke old refresh token and create new ones
        await AuthService.revokeRefreshToken(refreshToken);

        const newAccessToken = AuthService.generateToken({
          userId: user.id,
          username: user.username,
          email: user.email,
        });
        const newRefreshToken = await AuthService.createRefreshToken(user.id);

        const response: RefreshTokenResponse = {
          token: newAccessToken,
          refreshToken: newRefreshToken,
        };

        return reply.send(response);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({
          error: "Internal server error",
        });
      }
    },
  );

  // Logout (revoke refresh token)
  fastify.post(
    "/auth/logout",
    {
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const payload = AuthService.verifyToken(token);
          if (payload) {
            await AuthService.revokeAllUserRefreshTokens(payload.userId);
          }
        }
        return reply.send({ message: "Logged out successfully" });
      } catch (error) {
        fastify.log.error(error);
        return reply.send({ message: "Logged out successfully" });
      }
    },
  );
}
