import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authenticateToken } from "../lib/middleware";
import { prisma } from "../lib/prisma";
import {
  UserGoals,
  UpdateGoalsRequest,
  WeeklyProgress,
  WeekDay,
} from "../types/workout";

const VALID_WEEK_DAYS: ReadonlySet<WeekDay> = new Set([
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
]);

function sanitizeTargetDays(input: unknown): WeekDay[] | null {
  if (input === undefined) return null;
  if (!Array.isArray(input)) return [];
  const seen = new Set<WeekDay>();
  for (const item of input) {
    if (typeof item === "string" && VALID_WEEK_DAYS.has(item as WeekDay)) {
      seen.add(item as WeekDay);
    }
  }
  return [...seen];
}

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function ensureGoalHistory(
  userId: string,
  weeklyWorkoutGoal: number,
  fallbackEffectiveFrom: Date,
) {
  const existing = await prisma.weeklyGoalEntry.findFirst({
    where: { userId },
  });
  if (!existing) {
    await prisma.weeklyGoalEntry.create({
      data: {
        userId,
        weeklyWorkoutGoal,
        effectiveFrom: fallbackEffectiveFrom,
      },
    });
  }
}

function toUserGoalsResponse(goals: {
  id: string;
  weeklyWorkoutGoal: number;
  targetDays: string[];
  currentStreak: number;
  bestStreak: number;
  totalWeeksCompleted: number;
  lastWorkoutDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): UserGoals {
  return {
    id: goals.id,
    weeklyWorkoutGoal: goals.weeklyWorkoutGoal,
    targetDays: goals.targetDays as WeekDay[],
    currentStreak: goals.currentStreak,
    bestStreak: goals.bestStreak,
    totalWeeksCompleted: goals.totalWeeksCompleted,
    lastWorkoutDate: goals.lastWorkoutDate?.toISOString() || "",
    createdAt: goals.createdAt.toISOString(),
    updatedAt: goals.updatedAt.toISOString(),
  };
}

export async function goalsRoutes(fastify: FastifyInstance) {
  // Get user goals (creates default if none exist)
  fastify.get<{}>(
    "/goals",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        let goals = await prisma.userGoals.findFirst({
          where: { userId: request.user!.userId },
        });

        if (!goals) {
          // Create default goals if none exist
          goals = await prisma.userGoals.create({
            data: {
              userId: request.user!.userId,
              weeklyWorkoutGoal: 3,
              currentStreak: 0,
              bestStreak: 0,
              totalWeeksCompleted: 0,
            },
          });
        }

        await ensureGoalHistory(
          request.user!.userId,
          goals.weeklyWorkoutGoal,
          goals.createdAt,
        );

        reply.send(toUserGoalsResponse(goals));
      } catch (error) {
        reply.status(500).send({ error: "Failed to fetch goals" });
      }
    },
  );

  // Update user goals
  fastify.put<{ Body: UpdateGoalsRequest }>(
    "/goals",
    {
      preHandler: authenticateToken,
    },
    async (
      request: FastifyRequest<{ Body: UpdateGoalsRequest }>,
      reply: FastifyReply,
    ) => {
      try {
        const { weeklyWorkoutGoal } = request.body;
        const sanitizedTargetDays = sanitizeTargetDays(request.body.targetDays);

        let goals = await prisma.userGoals.findFirst({
          where: { userId: request.user!.userId },
        });

        const previousGoal = goals?.weeklyWorkoutGoal;

        if (!goals) {
          goals = await prisma.userGoals.create({
            data: {
              userId: request.user!.userId,
              weeklyWorkoutGoal: weeklyWorkoutGoal || 3,
              targetDays: sanitizedTargetDays ?? [],
              currentStreak: 0,
              bestStreak: 0,
              totalWeeksCompleted: 0,
            },
          });
        } else {
          goals = await prisma.userGoals.update({
            where: { id: goals.id },
            data: {
              weeklyWorkoutGoal: weeklyWorkoutGoal ?? goals.weeklyWorkoutGoal,
              ...(sanitizedTargetDays !== null && {
                targetDays: sanitizedTargetDays,
              }),
            },
          });
        }

        await ensureGoalHistory(
          request.user!.userId,
          goals.weeklyWorkoutGoal,
          goals.createdAt,
        );

        // Se o weeklyWorkoutGoal mudou, registra a nova entrada no histórico
        // com effectiveFrom = hoje (00:00 UTC).
        if (
          previousGoal !== undefined &&
          previousGoal !== goals.weeklyWorkoutGoal
        ) {
          await prisma.weeklyGoalEntry.create({
            data: {
              userId: request.user!.userId,
              weeklyWorkoutGoal: goals.weeklyWorkoutGoal,
              effectiveFrom: startOfDayUTC(new Date()),
            },
          });
        }

        reply.send(toUserGoalsResponse(goals));
      } catch (error) {
        reply.status(500).send({ error: "Failed to update goals" });
      }
    },
  );

  // Histórico de mudanças do weeklyWorkoutGoal
  fastify.get<{}>(
    "/goals/weekly-history",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Garante bootstrap caso o usuário ainda não tenha histórico
        const goals = await prisma.userGoals.findFirst({
          where: { userId: request.user!.userId },
        });
        if (goals) {
          await ensureGoalHistory(
            request.user!.userId,
            goals.weeklyWorkoutGoal,
            goals.createdAt,
          );
        }

        const history = await prisma.weeklyGoalEntry.findMany({
          where: { userId: request.user!.userId },
          orderBy: { effectiveFrom: "asc" },
        });

        reply.send(
          history.map((entry) => ({
            id: entry.id,
            weeklyWorkoutGoal: entry.weeklyWorkoutGoal,
            effectiveFrom: entry.effectiveFrom.toISOString(),
            createdAt: entry.createdAt.toISOString(),
          })),
        );
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({ error: "Failed to fetch goal history" });
      }
    },
  );

  // Get current week progress
  fastify.get<{}>(
    "/goals/week-progress",
    {
      preHandler: authenticateToken,
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const goals = await prisma.userGoals.findFirst({
          where: { userId: request.user!.userId },
        });
        if (!goals) {
          return reply.status(404).send({ error: "Goals not found" });
        }

        const now = new Date();
        const dayOfWeek = now.getDay();
        const sundayOffset = -dayOfWeek; // semana começa no domingo

        const weekStart = new Date(now);
        weekStart.setUTCDate(weekStart.getUTCDate() + sundayOffset);
        weekStart.setUTCHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
        weekEnd.setUTCHours(23, 59, 59, 999);

        // O cliente só usa `completedWorkouts`/`targetWorkouts`/`isCompleted`.
        // Trocamos o `findMany` com include profundo por um `count` direto.
        const completedWorkouts = await prisma.workout.count({
          where: {
            userId: request.user!.userId,
            date: { gte: weekStart, lte: weekEnd },
          },
        });

        const weeklyProgress: WeeklyProgress = {
          weekStartDate: weekStart.toISOString(),
          weekEndDate: weekEnd.toISOString(),
          targetWorkouts: goals.weeklyWorkoutGoal,
          completedWorkouts,
          isCompleted: completedWorkouts >= goals.weeklyWorkoutGoal,
          workouts: [],
        };

        reply.send(weeklyProgress);
      } catch (error) {
        reply.status(500).send({ error: "Failed to fetch week progress" });
      }
    },
  );
}
