import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { PrismaClient } from "../generated/prisma";
import { authenticateToken } from "../lib/middleware";
import {
  UserGoals,
  CreateGoalsRequest,
  UpdateGoalsRequest,
  WeeklyProgress,
  StreakInfo,
} from "../types/workout";

const prisma = new PrismaClient();

interface GoalsParams {
  id: string;
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

        const userGoals: UserGoals = {
          id: goals.id,
          weeklyWorkoutGoal: goals.weeklyWorkoutGoal,
          currentStreak: goals.currentStreak,
          bestStreak: goals.bestStreak,
          totalWeeksCompleted: goals.totalWeeksCompleted,
          lastWorkoutDate: goals.lastWorkoutDate?.toISOString() || "",
          createdAt: goals.createdAt.toISOString(),
          updatedAt: goals.updatedAt.toISOString(),
        };

        reply.send(userGoals);
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

        let goals = await prisma.userGoals.findFirst({
          where: { userId: request.user!.userId },
        });

        if (!goals) {
          goals = await prisma.userGoals.create({
            data: {
              userId: request.user!.userId,
              weeklyWorkoutGoal: weeklyWorkoutGoal || 3,
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
            },
          });
        }

        const userGoals: UserGoals = {
          id: goals.id,
          weeklyWorkoutGoal: goals.weeklyWorkoutGoal,
          currentStreak: goals.currentStreak,
          bestStreak: goals.bestStreak,
          totalWeeksCompleted: goals.totalWeeksCompleted,
          lastWorkoutDate: goals.lastWorkoutDate?.toISOString() || "",
          createdAt: goals.createdAt.toISOString(),
          updatedAt: goals.updatedAt.toISOString(),
        };

        reply.send(userGoals);
      } catch (error) {
        reply.status(500).send({ error: "Failed to update goals" });
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
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday as 0

        const weekStart = new Date(now);
        weekStart.setUTCDate(weekStart.getUTCDate() + mondayOffset);
        weekStart.setUTCHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
        weekEnd.setUTCHours(23, 59, 59, 999);

        const workouts = await prisma.workout.findMany({
          where: {
            userId: request.user!.userId,
            date: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
          include: {
            exercises: {
              include: {
                exercise: {
                  include: {
                    muscleGroups: true,
                  },
                },
                sets: true,
              },
            },
          },
          orderBy: {
            date: "asc",
          },
        });

        const weeklyProgress: WeeklyProgress = {
          weekStartDate: weekStart.toISOString(),
          weekEndDate: weekEnd.toISOString(),
          targetWorkouts: goals.weeklyWorkoutGoal,
          completedWorkouts: workouts.length,
          isCompleted: workouts.length >= goals.weeklyWorkoutGoal,
          workouts: workouts.map((workout) => ({
            id: workout.id,
            name: workout.name,
            date: workout.date.toISOString(),
            workoutType: workout.workoutType,
            dayOfWeek: workout.dayOfWeek,
            startTime: workout.startTime?.toISOString(),
            endTime: workout.endTime?.toISOString(),
            exercises: workout.exercises.map((ex) => ({
              id: ex.id,
              exerciseId: ex.exerciseId,
              exercise: {
                id: ex.exercise.id,
                name: ex.exercise.name,
                category: ex.exercise.category,
                muscleGroups: ex.exercise.muscleGroups.map(
                  (mg) => mg.muscleGroup,
                ),
              },
              sets: ex.sets.map((set) => ({
                id: set.id,
                reps: set.reps,
                weight: set.weight,
                duration: set.duration ?? undefined,
                distance: set.distance ?? undefined,
              })),
              notes: ex.notes ?? undefined,
            })),
            notes: workout.notes ?? undefined,
          })),
        };

        reply.send(weeklyProgress);
      } catch (error) {
        reply.status(500).send({ error: "Failed to fetch week progress" });
      }
    },
  );

  // Get streak information
  fastify.get<{}>(
    "/goals/streak-info",
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

        // Get current week progress
        const now = new Date();
        const currentDayOfWeek = now.getDay();
        const currentMondayOffset =
          currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;

        const weekStart = new Date(now);
        weekStart.setUTCDate(weekStart.getUTCDate() + currentMondayOffset);
        weekStart.setUTCHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
        weekEnd.setUTCHours(23, 59, 59, 999);

        const thisWeekWorkouts = await prisma.workout.count({
          where: {
            userId: request.user!.userId,
            date: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
        });

        const daysUntilDeadline = Math.ceil(
          (weekEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );
        const isOnTrack = thisWeekWorkouts >= goals.weeklyWorkoutGoal;

        // Calculate real-time streak values instead of using database cache
        let currentStreak = 0;
        let totalWeeksCompleted = 0;
        let lastWorkoutDate: Date | null = null;

        // Get last workout date
        const lastWorkout = await prisma.workout.findFirst({
          where: {
            userId: request.user!.userId,
          },
          orderBy: {
            date: "desc",
          },
          select: {
            date: true,
          },
        });

        if (lastWorkout) {
          lastWorkoutDate = lastWorkout.date;
        }

        // Calculate consecutive weeks with goal met, starting from current week backwards
        const currentWeekStart = new Date(now);
        const streakDayOfWeek = currentWeekStart.getDay();
        const streakMondayOffset =
          streakDayOfWeek === 0 ? -6 : 1 - streakDayOfWeek;
        currentWeekStart.setUTCDate(
          currentWeekStart.getUTCDate() + streakMondayOffset,
        );
        currentWeekStart.setUTCHours(0, 0, 0, 0);

        // Check current week and previous weeks for consecutive streak
        let weekOffset = 0;

        // Count consecutive weeks starting from current week
        while (weekOffset < 52) {
          const weekStartCalc = new Date(currentWeekStart);
          weekStartCalc.setUTCDate(
            currentWeekStart.getUTCDate() - weekOffset * 7,
          );

          const weekEndCalc = new Date(weekStartCalc);
          weekEndCalc.setUTCDate(weekStartCalc.getUTCDate() + 6);
          weekEndCalc.setUTCHours(23, 59, 59, 999);

          const workoutsInWeek = await prisma.workout.count({
            where: {
              userId: request.user!.userId,
              date: {
                gte: weekStartCalc,
                lte: weekEndCalc,
              },
            },
          });

          // Check if this is current week and it's incomplete
          const isCurrentWeek = weekOffset === 0;
          const weekIsComplete = now > weekEndCalc;

          if (workoutsInWeek >= goals.weeklyWorkoutGoal) {
            currentStreak++;
            totalWeeksCompleted++;
          } else if (isCurrentWeek && !weekIsComplete) {
            // Current week is incomplete, skip it for streak calculation but don't break
            weekOffset++;
            continue;
          } else {
            // Stop counting streak when we find a completed week that doesn't meet the goal
            break;
          }

          weekOffset++;
        }

        // Continue counting total weeks completed (non-consecutive)
        while (weekOffset < 52) {
          const weekStartCalc = new Date(currentWeekStart);
          weekStartCalc.setUTCDate(
            currentWeekStart.getUTCDate() - weekOffset * 7,
          );

          const weekEndCalc = new Date(weekStartCalc);
          weekEndCalc.setUTCDate(weekStartCalc.getUTCDate() + 6);
          weekEndCalc.setUTCHours(23, 59, 59, 999);

          const workoutsInWeek = await prisma.workout.count({
            where: {
              userId: request.user!.userId,
              date: {
                gte: weekStartCalc,
                lte: weekEndCalc,
              },
            },
          });

          if (workoutsInWeek >= goals.weeklyWorkoutGoal) {
            totalWeeksCompleted++;
          }

          weekOffset++;
        }

        const streakInfo: StreakInfo = {
          currentStreak,
          bestStreak: Math.max(goals.bestStreak, currentStreak),
          totalWeeksCompleted,
          isOnTrack,
          daysUntilDeadline: Math.max(0, daysUntilDeadline),
          lastWorkoutDate: lastWorkoutDate?.toISOString() || "",
        };

        reply.send(streakInfo);
      } catch (error) {
        reply.status(500).send({ error: "Failed to fetch streak info" });
      }
    },
  );

  // Update streak (called after workout completion)
  fastify.post<{}>(
    "/goals/update-streak",
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

        // Calculate weekly streak and totals
        const now = new Date();
        let currentStreak = 0;
        let totalWeeksCompleted = 0;
        let lastWorkoutDate: Date | null = null;

        // Get last workout date
        const lastWorkout = await prisma.workout.findFirst({
          where: {
            userId: request.user!.userId,
          },
          orderBy: {
            date: "desc",
          },
          select: {
            date: true,
          },
        });

        if (lastWorkout) {
          lastWorkoutDate = lastWorkout.date;
        }

        // Calculate consecutive weeks with goal met, starting from current week backwards
        const currentWeekStart = new Date(now);
        const streakDayOfWeek = currentWeekStart.getDay();
        const streakMondayOffset =
          streakDayOfWeek === 0 ? -6 : 1 - streakDayOfWeek;
        currentWeekStart.setUTCDate(
          currentWeekStart.getUTCDate() + streakMondayOffset,
        );
        currentWeekStart.setUTCHours(0, 0, 0, 0);

        // Check current week and previous weeks for consecutive streak
        let weekOffset = 0;

        // Count consecutive weeks starting from current week
        while (weekOffset < 52) {
          const weekStart = new Date(currentWeekStart);
          weekStart.setUTCDate(currentWeekStart.getUTCDate() - weekOffset * 7);

          const weekEnd = new Date(weekStart);
          weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
          weekEnd.setUTCHours(23, 59, 59, 999);

          const workoutsInWeek = await prisma.workout.count({
            where: {
              userId: request.user!.userId,
              date: {
                gte: weekStart,
                lte: weekEnd,
              },
            },
          });

          if (workoutsInWeek >= goals.weeklyWorkoutGoal) {
            currentStreak++;
            totalWeeksCompleted++;
          } else {
            // Stop counting streak when we find a week that doesn't meet the goal
            break;
          }

          weekOffset++;
        }

        // Continue counting total weeks completed (non-consecutive)
        while (weekOffset < 52) {
          const weekStart = new Date(currentWeekStart);
          weekStart.setUTCDate(currentWeekStart.getUTCDate() - weekOffset * 7);

          const weekEnd = new Date(weekStart);
          weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
          weekEnd.setUTCHours(23, 59, 59, 999);

          const workoutsInWeek = await prisma.workout.count({
            where: {
              userId: request.user!.userId,
              date: {
                gte: weekStart,
                lte: weekEnd,
              },
            },
          });

          if (workoutsInWeek >= goals.weeklyWorkoutGoal) {
            totalWeeksCompleted++;
          }

          weekOffset++;
        }

        const bestStreak = Math.max(goals.bestStreak, currentStreak);

        const updatedGoals = await prisma.userGoals.update({
          where: { id: goals.id },
          data: {
            currentStreak,
            bestStreak,
            totalWeeksCompleted,
            lastWorkoutDate: lastWorkoutDate,
          },
        });

        const userGoals: UserGoals = {
          id: updatedGoals.id,
          weeklyWorkoutGoal: updatedGoals.weeklyWorkoutGoal,
          currentStreak: updatedGoals.currentStreak,
          bestStreak: updatedGoals.bestStreak,
          totalWeeksCompleted: updatedGoals.totalWeeksCompleted,
          lastWorkoutDate: updatedGoals.lastWorkoutDate?.toISOString() || "",
          createdAt: updatedGoals.createdAt.toISOString(),
          updatedAt: updatedGoals.updatedAt.toISOString(),
        };

        reply.send(userGoals);
      } catch (error) {
        reply.status(500).send({ error: "Failed to update streak" });
      }
    },
  );
}
