import { FastifyInstance } from "fastify";
import {
  Workout,
  CreateWorkoutRequest,
  UpdateWorkoutRequest,
  WorkoutExercise,
} from "../types/workout";
import { prisma } from "../lib/prisma";

export async function workoutRoutes(fastify: FastifyInstance) {
  // Get all workouts
  fastify.get("/workouts", async (request, reply) => {
    try {
      const workouts = await prisma.workout.findMany({
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
    async (request, reply) => {
      try {
        const { id } = request.params;
        const workout = await prisma.workout.findUnique({
          where: { id },
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
          const goalsResponse = await fetch('http://localhost:3000/api/goals/update-streak', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

  // Update workout
  fastify.put<{ Params: { id: string }; Body: UpdateWorkoutRequest }>(
    "/workouts/:id",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { name, notes, endTime } = request.body;

        const workout = await prisma.workout.update({
          where: { id },
          data: {
            ...(name && { name }),
            ...(notes !== undefined && { notes }),
            ...(endTime && { endTime: new Date(endTime) }),
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
    async (request, reply) => {
      try {
        const { id } = request.params;
        await prisma.workout.delete({
          where: { id },
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
  }>("/workouts/:workoutId/exercises", async (request, reply) => {
    try {
      const { workoutId } = request.params;
      const { exerciseId, sets = [] } = request.body;

      // Check if workout exists
      const workout = await prisma.workout.findUnique({
        where: { id: workoutId },
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
