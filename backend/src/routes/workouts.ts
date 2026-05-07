import { FastifyInstance } from "fastify";
import {
  Workout,
  CreateWorkoutRequest,
  UpdateWorkoutRequest,
  WorkoutExercise,
} from "../types/workout";
import { prisma } from "../lib/prisma";
import { authenticateToken } from "../lib/middleware";

export async function workoutRoutes(fastify: FastifyInstance) {
  // Get all workouts
  fastify.get("/workouts", {
    preHandler: authenticateToken,
  }, async (request, reply) => {
    try {
      const workouts = await prisma.workout.findMany({
        where: {
          userId: request.user!.userId,
        },
        include: {
          exercises: {
            include: {
              exercise: true,
              sets: true,
            },
          },
        },
        orderBy: { date: "desc" },
      });

      return { workouts };
    } catch (error) {
      reply.code(500);
      return { error: "Failed to fetch workouts" };
    }
  });

  // Get workout by ID
  fastify.get<{ Params: { id: string } }>(
    "/workouts/:id",
    {
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const workout = await prisma.workout.findUnique({
          where: {
            id,
            userId: request.user!.userId,
          },
          include: {
            exercises: {
              include: {
                exercise: true,
                sets: true,
              },
            },
          },
        });

        if (!workout) {
          reply.code(404);
          return { error: "Workout not found" };
        }

        return { workout };
      } catch (error) {
        reply.code(500);
        return { error: "Failed to fetch workout" };
      }
    },
  );

  // Create new workout
  fastify.post<{ Body: CreateWorkoutRequest }>(
    "/workouts",
    {
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const {
          name,
          date,
          workoutType,
          dayOfWeek,
          exercises: workoutExercises = [],
          notes,
        } = request.body;

        const workout = await prisma.workout.create({
          data: {
            userId: request.user!.userId,
            name,
            date: new Date(date),
            workoutType,
            dayOfWeek,
            startTime: new Date(),
            notes,
            exercises: {
              create: workoutExercises.map((ex) => ({
                exerciseId: ex.exerciseId,
                notes: ex.notes,
                sets: {
                  create: (ex.sets || []).map((set) => ({
                    reps: set.reps || 0,
                    weight: set.weight || 0,
                    duration: set.duration,
                    distance: set.distance,
                    pace: set.pace,
                  })),
                },
              })),
            },
          },
          include: {
            exercises: {
              include: {
                exercise: true,
                sets: true,
              },
            },
          },
        });

        // Update streak after workout creation
        try {
          const authHeader = request.headers.authorization;
          const goalsResponse = await fetch('http://localhost:3000/goals/update-streak', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': authHeader || '',
            },
          });
        } catch (streakError) {
          console.warn('Failed to update streak:', streakError);
          // Don't fail workout creation if streak update fails
        }

        reply.code(201);
        return { workout };
      } catch (error) {
        console.error(error);
        reply.code(500);
        return { error: "Failed to create workout" };
      }
    },
  );

  // Update workout. Supports partial updates of fields and a full replacement
  // of the exercises/sets list when `exercises` is provided in the body.
  fastify.put<{ Params: { id: string }; Body: UpdateWorkoutRequest }>(
    "/workouts/:id",
    {
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const {
          name,
          notes,
          endTime,
          date,
          workoutType,
          dayOfWeek,
          exercises: workoutExercises,
        } = request.body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (notes !== undefined) updateData.notes = notes;
        if (endTime !== undefined) {
          updateData.endTime = endTime ? new Date(endTime) : null;
        }
        if (date !== undefined) updateData.date = new Date(date);
        if (workoutType !== undefined) updateData.workoutType = workoutType;
        if (dayOfWeek !== undefined) updateData.dayOfWeek = dayOfWeek;

        // Simple path: nothing to change in the exercise list. Single update,
        // P2025 catches a non-existent or non-owned workout.
        if (workoutExercises === undefined) {
          const workout = await prisma.workout.update({
            where: { id, userId: request.user!.userId },
            data: updateData,
            include: {
              exercises: { include: { exercise: true, sets: true } },
            },
          });
          return { workout };
        }

        // Full-edit path: replace exercises atomically. We verify ownership
        // up front so the transaction can use a simple `where: { id }`.
        const existing = await prisma.workout.findFirst({
          where: { id, userId: request.user!.userId },
          select: { id: true },
        });
        if (!existing) {
          reply.code(404);
          return { error: "Workout not found" };
        }

        const workout = await prisma.$transaction(async (tx) => {
          if (Object.keys(updateData).length > 0) {
            await tx.workout.update({ where: { id }, data: updateData });
          }
          await tx.workoutExercise.deleteMany({ where: { workoutId: id } });
          for (const ex of workoutExercises) {
            await tx.workoutExercise.create({
              data: {
                workoutId: id,
                exerciseId: ex.exerciseId,
                notes: ex.notes,
                sets: {
                  create: (ex.sets ?? []).map((set) => ({
                    reps: set.reps || 0,
                    weight: set.weight || 0,
                    duration: set.duration,
                    distance: set.distance,
                    pace: set.pace,
                  })),
                },
              },
            });
          }
          return tx.workout.findUnique({
            where: { id },
            include: {
              exercises: { include: { exercise: true, sets: true } },
            },
          });
        });

        return { workout };
      } catch (error: any) {
        if (error.code === "P2025") {
          reply.code(404);
          return { error: "Workout not found" };
        }
        reply.code(500);
        return { error: "Failed to update workout" };
      }
    },
  );

  // Delete workout
  fastify.delete<{ Params: { id: string } }>(
    "/workouts/:id",
    {
      preHandler: authenticateToken,
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        await prisma.workout.delete({
          where: {
            id,
            userId: request.user!.userId,
          },
        });

        reply.code(204);
        return;
      } catch (error: any) {
        if (error.code === "P2025") {
          reply.code(404);
          return { error: "Workout not found" };
        }
        reply.code(500);
        return { error: "Failed to delete workout" };
      }
    },
  );

  // Add exercise to workout
  fastify.post<{
    Params: { workoutId: string };
    Body: { exerciseId: string; sets?: any[] };
  }>("/workouts/:workoutId/exercises", {
    preHandler: authenticateToken,
  }, async (request, reply) => {
    try {
      const { workoutId } = request.params;
      const { exerciseId, sets = [] } = request.body;

      // Check if workout exists and belongs to user
      const workout = await prisma.workout.findUnique({
        where: {
          id: workoutId,
          userId: request.user!.userId,
        },
      });

      if (!workout) {
        reply.code(404);
        return { error: "Workout not found" };
      }

      // Check if exercise exists
      const exercise = await prisma.exercise.findUnique({
        where: { id: exerciseId },
      });

      if (!exercise) {
        reply.code(404);
        return { error: "Exercise not found" };
      }

      const workoutExercise = await prisma.workoutExercise.create({
        data: {
          workoutId,
          exerciseId,
          sets: {
            create: sets.map((set) => ({
              reps: set.reps || 0,
              weight: set.weight || 0,
              duration: set.duration,
              distance: set.distance,
              pace: set.pace,
            })),
          },
        },
        include: {
          exercise: true,
          sets: true,
        },
      });

      return { workoutExercise };
    } catch (error) {
      reply.code(500);
      return { error: "Failed to add exercise to workout" };
    }
  });
}
