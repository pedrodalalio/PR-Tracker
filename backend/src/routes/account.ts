import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { AuthService } from "../lib/auth";
import { authenticateToken } from "../lib/middleware";
import { prisma } from "../lib/prisma";
import { clearRefreshCookie } from "../lib/cookies";
import { logAuthEvent } from "../lib/audit";

export async function accountRoutes(fastify: FastifyInstance) {
  // Export completo: tudo do usuário num único JSON. LGPD art. 18, II
  // (portabilidade). O frontend baixa via blob — preservamos a estrutura
  // aninhada porque o uso primário é arquivamento, não análise tabular.
  fastify.get(
    "/account/export",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        const userId = request.user!.userId;
        const [user, workouts, runs, weights, goals, exercises] =
          await Promise.all([
            prisma.user.findUnique({
              where: { id: userId },
              select: {
                id: true,
                username: true,
                email: true,
                createdAt: true,
              },
            }),
            prisma.workout.findMany({
              where: { userId },
              include: { exercises: { include: { exercise: true, sets: true } } },
              orderBy: { date: "asc" },
            }),
            prisma.run.findMany({
              where: { userId },
              orderBy: { date: "asc" },
            }),
            prisma.weightEntry.findMany({
              where: { userId },
              orderBy: { recordedAt: "asc" },
            }),
            prisma.userGoals.findUnique({ where: { userId } }),
            prisma.exercise.findMany({
              include: { muscleGroups: true },
              orderBy: { name: "asc" },
            }),
          ]);

        if (!user) {
          return reply.status(404).send({ error: "User not found" });
        }

        const payload = {
          exportedAt: new Date().toISOString(),
          schemaVersion: 1,
          user,
          goals,
          workouts,
          runs,
          weights,
          // Inclui exercícios cadastrados globalmente porque sets dos workouts
          // só guardam o exerciseId.
          exercises,
        };

        const stamp = new Date().toISOString().slice(0, 10);
        reply.header("Content-Type", "application/json; charset=utf-8");
        reply.header(
          "Content-Disposition",
          `attachment; filename="pr-tracker-export-${stamp}.json"`,
        );
        // JSON.stringify pra forçar o reply a tratar como texto bruto e não
        // serializar de novo (perderíamos o BigInt do Strava athleteId).
        return reply.send(
          JSON.stringify(
            payload,
            (_key, value) =>
              typeof value === "bigint" ? value.toString() : value,
            2,
          ),
        );
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to export account" });
      }
    },
  );

  // Hard-delete com confirmação por senha. Cascade do schema cuida do resto
  // (workouts, runs, weights, goals, refresh tokens, strava conn etc.).
  fastify.delete<{ Body: { password?: string } }>(
    "/account",
    { preHandler: authenticateToken },
    async (
      request: FastifyRequest<{ Body: { password?: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const password = request.body?.password;
        if (typeof password !== "string" || password.length === 0) {
          return reply.status(400).send({ error: "Senha obrigatória" });
        }

        const user = await prisma.user.findUnique({
          where: { id: request.user!.userId },
        });
        if (!user) {
          return reply.status(404).send({ error: "User not found" });
        }

        const isValid = await AuthService.comparePassword(password, user.password);
        if (!isValid) {
          logAuthEvent({
            request,
            userId: user.id,
            eventType: "login_failed",
            email: user.email,
            metadata: { reason: "account_delete_wrong_password" },
          });
          return reply.status(401).send({ error: "Senha incorreta" });
        }

        const email = user.email;
        await prisma.user.delete({ where: { id: user.id } });
        clearRefreshCookie(reply);
        // userId é null no log porque o user já foi deletado e a coluna não
        // tem FK pra sobreviver à exclusão.
        logAuthEvent({
          request,
          userId: null,
          eventType: "account_deleted",
          email,
        });

        return reply.status(204).send();
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Failed to delete account" });
      }
    },
  );
}
