import { FastifyInstance } from "fastify";
import { AuthService } from "../lib/auth";
import { prisma } from "../lib/prisma";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../lib/validation";
import { RegisterRequest, LoginRequest } from "../types/auth";
import { authenticateToken } from "../lib/middleware";
import { setRefreshCookie, clearRefreshCookie, REFRESH_COOKIE } from "../lib/cookies";
import { sendPasswordResetEmail } from "../lib/mail";
import { getFrontendUrl } from "../lib/strava-client";

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: RegisterRequest }>(
    "/auth/register",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 hour" },
      },
    },
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
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
    },
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

  fastify.post(
    "/auth/refresh",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
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

  // Sempre responde 200 com mensagem genérica, independente do email existir.
  // Evita enumeration de contas via timing/diff de respostas.
  fastify.post<{ Body: { email: string } }>(
    "/auth/forgot-password",
    {
      config: {
        rateLimit: { max: 3, timeWindow: "1 hour" },
      },
    },
    async (request, reply) => {
      try {
        const { error, value } = forgotPasswordSchema.validate(request.body);
        if (error) {
          return reply.status(400).send({
            error: "Validation failed",
            details: error.details.map((d: any) => d.message),
          });
        }

        const { email } = value as { email: string };
        const user = await prisma.user.findUnique({ where: { email } });

        if (user) {
          const token = await AuthService.createPasswordResetToken(user.id);
          const resetUrl = `${getFrontendUrl()}/reset-password?token=${encodeURIComponent(
            token,
          )}`;
          await sendPasswordResetEmail(user.email, resetUrl);
        }

        return reply.send({
          message:
            "Se houver uma conta com esse e-mail, enviamos instruções para redefinir a senha.",
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  fastify.post<{ Body: { token: string; password: string } }>(
    "/auth/reset-password",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 hour" },
      },
    },
    async (request, reply) => {
      try {
        const { error, value } = resetPasswordSchema.validate(request.body);
        if (error) {
          return reply.status(400).send({
            error: "Validation failed",
            details: error.details.map((d: any) => d.message),
          });
        }

        const { token, password } = value as { token: string; password: string };

        const consumed = await AuthService.consumePasswordResetToken(token);
        if (!consumed) {
          return reply.status(400).send({
            error: "Token inválido ou expirado",
          });
        }

        const hashedPassword = await AuthService.hashPassword(password);

        await prisma.user.update({
          where: { id: consumed.userId },
          data: { password: hashedPassword },
        });

        // Revoga todas as sessões ativas — força re-login com senha nova.
        await AuthService.revokeAllUserRefreshTokens(consumed.userId);

        return reply.send({
          message: "Senha redefinida com sucesso. Faça login com a nova senha.",
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

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
