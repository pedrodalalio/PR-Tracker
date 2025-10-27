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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const goals = await prisma.userGoals.findFirst();
        if (!goals) {
          return reply.status(404).send({ error: "Goals not found" });
        }

        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday as 0

        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() + mondayOffset);
        weekStart.setHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const workouts = await prisma.workout.findMany({
          where: {
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
            date: workout.date.toISOString().split("T")[0],
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const goals = await prisma.userGoals.findFirst();
        if (!goals) {
          return reply.status(404).send({ error: "Goals not found" });
        }

        // Get current week progress
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        const weekStart = new Date(now);
        weekStart.setUTCDate(weekStart.getUTCDate() + mondayOffset);
        weekStart.setUTCHours(0, 0, 0, 0);

        const weekEnd = new Date(weekStart);
        weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
        weekEnd.setUTCHours(23, 59, 59, 999);

        const thisWeekWorkouts = await prisma.workout.count({
          where: {
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

        const streakInfo: StreakInfo = {
          currentStreak: goals.currentStreak,
          bestStreak: goals.bestStreak,
          totalWeeksCompleted: goals.totalWeeksCompleted,
          isOnTrack,
          daysUntilDeadline: Math.max(0, daysUntilDeadline),
          lastWorkoutDate: goals.lastWorkoutDate?.toISOString() || "",
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
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const goals = await prisma.userGoals.findFirst();
        if (!goals) {
          return reply.status(404).send({ error: "Goals not found" });
        }

        // Calculate daily streak - check consecutive days with workouts
        const now = new Date();
        now.setUTCHours(23, 59, 59, 999); // End of today

        let currentStreak = 0;
        let totalWeeksCompleted = 0;
        let lastWorkoutDate: Date | null = null;

        // Get all workout dates sorted by date (descending)
        const workouts = await prisma.workout.findMany({
          where: {
            date: {
              lte: now,
            },
          },
          orderBy: {
            date: "desc",
          },
          select: {
            date: true,
          },
        });

        // Group workouts by date (in case multiple workouts per day)
        const workoutDates = [
          ...new Set(workouts.map((w) => w.date.toISOString().split("T")[0])),
        ];

        if (workoutDates.length > 0) {
          lastWorkoutDate = new Date(workoutDates[0] + "T00:00:00.000Z");

          // Check if there's a workout today or yesterday to start the streak
          const today = new Date();
          today.setUTCHours(0, 0, 0, 0);
          const yesterday = new Date(today);
          yesterday.setUTCDate(today.getUTCDate() - 1);

          const lastWorkoutDateOnly = new Date(
            workoutDates[0] + "T00:00:00.000Z",
          );

          // Only start counting if last workout was today or yesterday
          if (lastWorkoutDateOnly >= yesterday) {
            // Count consecutive days backwards from the most recent workout
            let checkDate = new Date(workoutDates[0] + "T00:00:00.000Z");
            let workoutIndex = 0;

            while (workoutIndex < workoutDates.length) {
              const workoutDate = new Date(
                workoutDates[workoutIndex] + "T00:00:00.000Z",
              );

              if (workoutDate.getTime() === checkDate.getTime()) {
                currentStreak++;
                workoutIndex++;
                checkDate.setUTCDate(checkDate.getUTCDate() - 1);
              } else if (workoutDate < checkDate) {
                // Gap found, break the streak
                break;
              } else {
                // This shouldn't happen with sorted data
                workoutIndex++;
              }
            }
          }
        }

        // Calculate weekly completions for weekly progress tracking
        const weekStart = new Date(now);
        const dayOfWeek = weekStart.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        weekStart.setUTCDate(weekStart.getUTCDate() + mondayOffset);
        weekStart.setUTCHours(0, 0, 0, 0);

        for (let weekOffset = 0; weekOffset < 52; weekOffset++) {
          const currentWeekStart = new Date(weekStart);
          currentWeekStart.setUTCDate(weekStart.getUTCDate() - weekOffset * 7);

          const currentWeekEnd = new Date(currentWeekStart);
          currentWeekEnd.setUTCDate(currentWeekStart.getUTCDate() + 6);
          currentWeekEnd.setUTCHours(23, 59, 59, 999);

          const workoutsInWeek = await prisma.workout.count({
            where: {
              date: {
                gte: currentWeekStart,
                lte: currentWeekEnd,
              },
            },
          });

          if (workoutsInWeek >= goals.weeklyWorkoutGoal) {
            totalWeeksCompleted++;
          }
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
