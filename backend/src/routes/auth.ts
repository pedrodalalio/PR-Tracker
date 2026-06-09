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
import { sendEmailVerification, sendPasswordResetEmail } from "../lib/mail";
import { getFrontendUrl } from "../lib/strava-client";
import { logAuthEvent } from "../lib/audit";
import { getDemoUser } from "../lib/demo";

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

        // Dispara verificação de email — não bloqueia o fluxo se o mail
        // provider (hoje mock) falhar.
        try {
          const verifyToken = await AuthService.createEmailVerificationToken(
            user.id,
          );
          const verifyUrl = `${getFrontendUrl()}/verify-email?token=${encodeURIComponent(
            verifyToken,
          )}`;
          await sendEmailVerification(user.email, verifyUrl);
        } catch (err) {
          fastify.log.warn({ err }, "failed to send verification email");
        }

        logAuthEvent({
          request,
          userId: user.id,
          eventType: "register",
          email: user.email,
        });

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
          logAuthEvent({
            request,
            eventType: "login_failed",
            email: usernameOrEmail,
            metadata: { reason: "unknown_user" },
          });
          return reply.status(401).send({ error: "Invalid credentials" });
        }

        const isPasswordValid = await AuthService.comparePassword(
          password,
          user.password,
        );
        if (!isPasswordValid) {
          logAuthEvent({
            request,
            userId: user.id,
            eventType: "login_failed",
            email: user.email,
            metadata: { reason: "wrong_password" },
          });
          return reply.status(401).send({ error: "Invalid credentials" });
        }

        logAuthEvent({
          request,
          userId: user.id,
          eventType: "login_success",
          email: user.email,
        });

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

  // Acesso demo: entra na conta demo compartilhada e devolve tokens, igual ao
  // login. Sem senha — o objetivo é entrada em 1 clique para visualização.
  // Quase sempre instantâneo (a conta já existe); o seed completo só ocorre na
  // primeira vez de todas.
  fastify.post(
    "/auth/demo",
    {
      config: {
        rateLimit: { max: 5, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
      try {
        const user = await getDemoUser();

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
        return reply.status(500).send({ error: "Failed to create demo session" });
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
          select: {
            id: true,
            username: true,
            email: true,
            emailVerifiedAt: true,
            createdAt: true,
          },
        });

        if (!user) {
          return reply.status(404).send({ error: "User not found" });
        }

        return reply.send({
          user: {
            ...user,
            emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
          },
        });
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
          logAuthEvent({
            request,
            userId: user.id,
            eventType: "password_reset_request",
            email: user.email,
          });
        } else {
          logAuthEvent({
            request,
            eventType: "password_reset_request",
            email,
            metadata: { unknownEmail: true },
          });
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

        logAuthEvent({
          request,
          userId: consumed.userId,
          eventType: "password_reset_complete",
        });

        return reply.send({
          message: "Senha redefinida com sucesso. Faça login com a nova senha.",
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  fastify.post<{ Body: { token: string } }>(
    "/auth/verify-email",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 hour" },
      },
    },
    async (request, reply) => {
      try {
        const token = (request.body as any)?.token;
        if (typeof token !== "string" || token.length === 0) {
          return reply.status(400).send({ error: "Token obrigatório" });
        }

        const consumed = await AuthService.consumeEmailVerificationToken(token);
        if (!consumed) {
          return reply.status(400).send({ error: "Token inválido ou expirado" });
        }

        logAuthEvent({
          request,
          userId: consumed.userId,
          eventType: "email_verified",
        });

        return reply.send({ message: "E-mail verificado com sucesso." });
      } catch (error) {
        fastify.log.error(error);
        return reply.status(500).send({ error: "Internal server error" });
      }
    },
  );

  // Reenviar verificação. Sempre 200 com mensagem genérica pra não vazar se
  // o email está cadastrado ou já foi verificado.
  fastify.post(
    "/auth/resend-verification",
    {
      preHandler: authenticateToken,
      config: { rateLimit: { max: 3, timeWindow: "1 hour" } },
    },
    async (request, reply) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: request.user!.userId },
        });
        if (user && !user.emailVerifiedAt) {
          const verifyToken = await AuthService.createEmailVerificationToken(
            user.id,
          );
          const verifyUrl = `${getFrontendUrl()}/verify-email?token=${encodeURIComponent(
            verifyToken,
          )}`;
          await sendEmailVerification(user.email, verifyUrl);
        }
        return reply.send({
          message: "Se ainda não verificado, enviamos um novo link.",
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
