import { FastifyInstance } from "fastify";
import { PrismaClient } from "../generated/prisma";
import { AuthService } from "../lib/auth";
import { registerSchema, loginSchema } from "../lib/validation";
import { RegisterRequest, LoginRequest, AuthResponse } from "../types/auth";
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

        // Generate token
        const token = AuthService.generateToken({
          userId: user.id,
          username: user.username,
          email: user.email,
        });

        const response: AuthResponse = {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          token,
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

        // Generate token
        const token = AuthService.generateToken({
          userId: user.id,
          username: user.username,
          email: user.email,
        });

        const response: AuthResponse = {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          token,
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

  // Logout (client-side token removal, but we can add token blacklisting later)
  fastify.post(
    "/auth/logout",
    {
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      // For now, just return success - token invalidation happens on client
      // In a more robust system, we'd add the token to a blacklist
      return reply.send({ message: "Logged out successfully" });
    },
  );
}
