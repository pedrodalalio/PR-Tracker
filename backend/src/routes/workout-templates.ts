import { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma";
import { authenticateToken } from "../lib/middleware";

interface TemplateExerciseInput {
  exerciseId: string;
  notes?: string;
}

interface CreateTemplateBody {
  name: string;
  workoutType: "upper" | "lower";
  exercises?: TemplateExerciseInput[];
}

interface UpdateTemplateBody {
  name?: string;
  workoutType?: "upper" | "lower";
  exercises?: TemplateExerciseInput[];
}

export async function workoutTemplateRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/workout-templates",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        const templates = await prisma.workoutTemplate.findMany({
          where: { userId: request.user!.userId },
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { position: "asc" },
            },
          },
          orderBy: { createdAt: "desc" },
        });
        return { templates };
      } catch (error) {
        request.log.error(error);
        reply.code(500);
        return { error: "Failed to fetch templates" };
      }
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/workout-templates/:id",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        const template = await prisma.workoutTemplate.findFirst({
          where: { id: request.params.id, userId: request.user!.userId },
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { position: "asc" },
            },
          },
        });
        if (!template) {
          reply.code(404);
          return { error: "Template not found" };
        }
        return { template };
      } catch (error) {
        request.log.error(error);
        reply.code(500);
        return { error: "Failed to fetch template" };
      }
    },
  );

  fastify.post<{ Body: CreateTemplateBody }>(
    "/workout-templates",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        const { name, workoutType, exercises = [] } = request.body;
        if (!name || typeof name !== "string") {
          reply.code(400);
          return { error: "name is required" };
        }
        if (workoutType !== "upper" && workoutType !== "lower") {
          reply.code(400);
          return { error: "workoutType must be 'upper' or 'lower'" };
        }
        const template = await prisma.workoutTemplate.create({
          data: {
            userId: request.user!.userId,
            name: name.trim(),
            workoutType,
            exercises: {
              create: exercises.map((ex, idx) => ({
                exerciseId: ex.exerciseId,
                position: idx,
                notes: ex.notes,
              })),
            },
          },
          include: {
            exercises: {
              include: { exercise: true },
              orderBy: { position: "asc" },
            },
          },
        });
        reply.code(201);
        return { template };
      } catch (error) {
        request.log.error(error);
        reply.code(500);
        return { error: "Failed to create template" };
      }
    },
  );

  fastify.put<{ Params: { id: string }; Body: UpdateTemplateBody }>(
    "/workout-templates/:id",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const { name, workoutType, exercises } = request.body;

        const updateData: { name?: string; workoutType?: "upper" | "lower" } =
          {};
        if (name !== undefined) {
          if (typeof name !== "string" || !name.trim()) {
            reply.code(400);
            return { error: "name must be a non-empty string" };
          }
          updateData.name = name.trim();
        }
        if (workoutType !== undefined) {
          if (workoutType !== "upper" && workoutType !== "lower") {
            reply.code(400);
            return { error: "workoutType must be 'upper' or 'lower'" };
          }
          updateData.workoutType = workoutType;
        }

        // Path simples: nada de exercises pra alterar.
        if (exercises === undefined) {
          const template = await prisma.workoutTemplate.update({
            where: { id, userId: request.user!.userId },
            data: updateData,
            include: {
              exercises: {
                include: { exercise: true },
                orderBy: { position: "asc" },
              },
            },
          });
          return { template };
        }

        const existing = await prisma.workoutTemplate.findFirst({
          where: { id, userId: request.user!.userId },
          select: { id: true },
        });
        if (!existing) {
          reply.code(404);
          return { error: "Template not found" };
        }

        // Replace atômico: mesma estratégia dos workouts (serializable).
        const template = await prisma.$transaction(
          async (tx) => {
            if (Object.keys(updateData).length > 0) {
              await tx.workoutTemplate.update({
                where: { id },
                data: updateData,
              });
            }
            await tx.workoutTemplateExercise.deleteMany({
              where: { templateId: id },
            });
            for (let idx = 0; idx < exercises.length; idx++) {
              const ex = exercises[idx]!;
              await tx.workoutTemplateExercise.create({
                data: {
                  templateId: id,
                  exerciseId: ex.exerciseId,
                  position: idx,
                  notes: ex.notes,
                },
              });
            }
            return tx.workoutTemplate.findUnique({
              where: { id },
              include: {
                exercises: {
                  include: { exercise: true },
                  orderBy: { position: "asc" },
                },
              },
            });
          },
          { isolationLevel: "Serializable" },
        );

        return { template };
      } catch (error: any) {
        if (error.code === "P2025") {
          reply.code(404);
          return { error: "Template not found" };
        }
        if (error.code === "P2034" || error.meta?.code === "40001") {
          reply.code(409);
          return { error: "Concurrent edit detected, please retry" };
        }
        request.log.error(error);
        reply.code(500);
        return { error: "Failed to update template" };
      }
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/workout-templates/:id",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        await prisma.workoutTemplate.delete({
          where: {
            id: request.params.id,
            userId: request.user!.userId,
          },
        });
        reply.code(204);
        return;
      } catch (error: any) {
        if (error.code === "P2025") {
          reply.code(404);
          return { error: "Template not found" };
        }
        request.log.error(error);
        reply.code(500);
        return { error: "Failed to delete template" };
      }
    },
  );
}
