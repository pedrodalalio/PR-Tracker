import { FastifyInstance } from "fastify";
import { CreateExerciseRequest } from "../types/workout";
import { prisma } from "../lib/prisma";

export async function exerciseRoutes(fastify: FastifyInstance) {
  // Get all exercises
  fastify.get("/exercises", async (request, reply) => {
    try {
      const exercises = await prisma.exercise.findMany({
        include: {
          muscleGroups: true,
        },
        orderBy: { name: "asc" },
      });
      return { exercises };
    } catch (error) {
      reply.code(500);
      return { error: "Failed to fetch exercises" };
    }
  });

  // Get exercise by ID
  fastify.get<{ Params: { id: string } }>(
    "/exercises/:id",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const exercise = await prisma.exercise.findUnique({
          where: { id },
          include: {
            muscleGroups: true,
          },
        });

        if (!exercise) {
          reply.code(404);
          return { error: "Exercise not found" };
        }

        return { exercise };
      } catch (error) {
        reply.code(500);
        return { error: "Failed to fetch exercise" };
      }
    },
  );

  // Create new exercise
  fastify.post<{ Body: CreateExerciseRequest }>(
    "/exercises",
    async (request, reply) => {
      try {
        const { name, category, muscleGroups } = request.body;

        const exercise = await prisma.exercise.create({
          data: {
            name,
            category,
            muscleGroups: {
              create: muscleGroups.map((muscleGroup) => ({
                muscleGroup,
              })),
            },
          },
          include: {
            muscleGroups: true,
          },
        });

        reply.code(201);
        return { exercise };
      } catch (error: any) {
        if (error.code === "P2002") {
          reply.code(400);
          return { error: "Exercise with this name already exists" };
        }
        reply.code(500);
        return { error: "Failed to create exercise" };
      }
    },
  );

  // Update exercise
  fastify.put<{ Params: { id: string }; Body: Partial<CreateExerciseRequest> }>(
    "/exercises/:id",
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { muscleGroups, ...updates } = request.body;

        const exercise = await prisma.exercise.update({
          where: { id },
          data: {
            ...updates,
            ...(muscleGroups && {
              muscleGroups: {
                deleteMany: {},
                create: muscleGroups.map((muscleGroup) => ({
                  muscleGroup,
                })),
              },
            }),
          },
          include: {
            muscleGroups: true,
          },
        });

        return { exercise };
      } catch (error: any) {
        if (error.code === "P2025") {
          reply.code(404);
          return { error: "Exercise not found" };
        }
        if (error.code === "P2002") {
          reply.code(400);
          return { error: "Exercise with this name already exists" };
        }
        reply.code(500);
        return { error: "Failed to update exercise" };
      }
    },
  );

  // Delete exercise
  fastify.delete<{ Params: { id: string } }>(
    "/exercises/:id",
    async (request, reply) => {
      try {
        const { id } = request.params;
        await prisma.exercise.delete({
          where: { id },
        });

        reply.code(204);
        return;
      } catch (error: any) {
        if (error.code === "P2025") {
          reply.code(404);
          return { error: "Exercise not found" };
        }
        reply.code(500);
        return { error: "Failed to delete exercise" };
      }
    },
  );

  // Get exercises by category
  fastify.get<{ Params: { category: string } }>(
    "/exercises/category/:category",
    async (request, reply) => {
      try {
        const { category } = request.params;
        const exercises = await prisma.exercise.findMany({
          where: { category: category as any },
          include: {
            muscleGroups: true,
          },
          orderBy: { name: "asc" },
        });
        return { exercises };
      } catch (error) {
        reply.code(500);
        return { error: "Failed to fetch exercises" };
      }
    },
  );

  // Search exercises by muscle group
  fastify.get<{ Querystring: { muscle: string } }>(
    "/exercises/search",
    async (request, reply) => {
      try {
        const { muscle } = request.query;

        if (!muscle) {
          const exercises = await prisma.exercise.findMany({
            include: {
              muscleGroups: true,
            },
            orderBy: { name: "asc" },
          });
          return { exercises };
        }

        const exercises = await prisma.exercise.findMany({
          where: {
            muscleGroups: {
              some: {
                muscleGroup: {
                  contains: muscle,
                  mode: "insensitive",
                },
              },
            },
          },
          include: {
            muscleGroups: true,
          },
          orderBy: { name: "asc" },
        });

        return { exercises };
      } catch (error) {
        reply.code(500);
        return { error: "Failed to search exercises" };
      }
    },
  );
}
