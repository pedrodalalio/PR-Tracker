import { FastifyInstance } from "fastify";
import { PrismaClient } from "../generated/prisma";
import { AuthService } from "../lib/auth";
import { registerSchema, loginSchema } from "../lib/validation";
import { RegisterRequest, LoginRequest } from "../types/auth";
import { authenticateToken } from "../lib/middleware";
import { setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE } from "../lib/cookies";

const prisma = new PrismaClient();

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: RegisterRequest }>(
    "/auth/register",
    async (request, reply) => {
      try {
        const { error, value } = registerSchema.validate(request.body);
        if (error) {
          return reply.status(400).send({
            error: "Validation failed",
            details: error.details.map((d: any) => d.message),
          });
        }

        const { username, email, password } = value;

        const existingUser = await prisma.user.findFirst({
          where: { OR: [{ username }, { email }] },
        });

        if (existingUser) {
          const field =
            existingUser.username === username ? "username" : "email";
          return reply.status(409).send({
            error: `User with this ${field} already exists`,
          });
        }

        const hashedPassword = await AuthService.hashPassword(password);

        const user = await prisma.user.create({
          data: { username, email, password: hashedPassword },
          select: { id: true, username: true, email: true, createdAt: true },
        });

        await prisma.userGoals.create({ data: { userId: user.id } });

        const token = AuthService.generateToken({
          userId: user.id,
          username: user.username,
          email: user.email,
        });
        const refreshToken = await AuthService.createRefreshToken(user.id);

        setRefreshCookie(reply, refreshToken);

        return reply.status(201).send({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          token,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  fastify.post<{ Body: LoginRequest }>(
    "/auth/login",
    async (request, reply) => {
      try {
        const { error, value } = loginSchema.validate(request.body);
        if (error) {
          return reply.status(400).send({
            error: "Validation failed",
            details: error.details.map((d: any) => d.message),
          });
        }

        const { usernameOrEmail, password } = value;

        const user = await prisma.user.findFirst({
          where: {
            OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
          },
        });

        if (!user) {
          return reply.status(401).send({ error: "Invalid credentials" });
        }

        const isPasswordValid = await AuthService.comparePassword(
          password,
          user.password,
        );
        if (!isPasswordValid) {
          return reply.status(401).send({ error: "Invalid credentials" });
        }

        const token = AuthService.generateToken({
          userId: user.id,
          username: user.username,
          email: user.email,
        });
        const refreshToken = await AuthService.createRefreshToken(user.id);

        setRefreshCookie(reply, refreshToken);

        return reply.send({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
          token,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  fastify.get(
    "/auth/me",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: request.user!.userId },
          select: { id: true, username: true, email: true, createdAt: true },
        });

        if (!user) {
          return reply.status(404).send({ error: "User not found" });
        }

        return reply.send({ user });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  fastify.post("/auth/refresh", async (request, reply) => {
    try {
      const refreshToken = request.cookies?.[REFRESH_COOKIE];

      if (!refreshToken) {
        return reply.status(401).send({ error: "Refresh token missing" });
      }

      const tokenValidation = await AuthService.validateRefreshToken(refreshToken);
      if (!tokenValidation) {
        clearRefreshCookie(reply);
        return reply.status(401).send({ error: "Invalid or expired refresh token" });
      }

      const user = await prisma.user.findUnique({
        where: { id: tokenValidation.userId },
        select: { id: true, username: true, email: true },
      });

      if (!user) {
        clearRefreshCookie(reply);
        return reply.status(404).send({ error: "User not found" });
      }

      await AuthService.revokeRefreshToken(refreshToken);

      const newAccessToken = AuthService.generateToken({
        userId: user.id,
        username: user.username,
        email: user.email,
      });
      const newRefreshToken = await AuthService.createRefreshToken(user.id);

      setRefreshCookie(reply, newRefreshToken);

      return reply.send({ user, token: newAccessToken });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/auth/logout", async (request, reply) => {
    try {
      const refreshToken = request.cookies?.[REFRESH_COOKIE];
      if (refreshToken) {
        await AuthService.revokeRefreshToken(refreshToken);
      }
      clearRefreshCookie(reply);
      return reply.send({ message: "Logged out successfully" });
    } catch (error) {
      fastify.log.error(error);
      clearRefreshCookie(reply);
      return reply.send({ message: "Logged out successfully" });
    }
  });
}
