import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma";
import { authenticateToken } from "../lib/middleware";

interface WeightEntryDTO {
  id: string;
  weight: number;
  recordedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CreateWeightBody {
  weight: number;
  recordedAt?: string;
  notes?: string;
}

interface UpdateWeightBody {
  weight?: number;
  recordedAt?: string;
  notes?: string | null;
}

function toDTO(entry: {
  id: string;
  weight: number;
  recordedAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): WeightEntryDTO {
  return {
    id: entry.id,
    weight: entry.weight,
    recordedAt: entry.recordedAt.toISOString(),
    notes: entry.notes,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
  };
}

function parseWeight(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  if (n <= 0 || n > 1000) return null;
  return Math.round(n * 100) / 100;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function weightsRoutes(fastify: FastifyInstance) {
  fastify.get<{ Querystring: { limit?: string } }>(
    "/weights",
    { preHandler: authenticateToken },
    async (request, reply) => {
      try {
        const take = Math.min(
          5000,
          Math.max(1, Number(request.query.limit) || 1000),
        );
        const entries = await prisma.weightEntry.findMany({
          where: { userId: request.user!.userId },
          orderBy: { recordedAt: "desc" },
          take,
        });
        reply.send({ weights: entries.map(toDTO) });
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({ error: "Failed to fetch weight entries" });
      }
    },
  );

  fastify.post<{ Body: CreateWeightBody }>(
    "/weights",
    { preHandler: authenticateToken },
    async (
      request: FastifyRequest<{ Body: CreateWeightBody }>,
      reply: FastifyReply,
    ) => {
      try {
        const weight = parseWeight(request.body?.weight);
        if (weight === null) {
          return reply
            .status(400)
            .send({ error: "Peso inválido (precisa ser entre 0 e 1000 kg)" });
        }

        const recordedAt = request.body?.recordedAt
          ? parseDate(request.body.recordedAt)
          : new Date();
        if (!recordedAt) {
          return reply.status(400).send({ error: "Data inválida" });
        }

        const notes =
          typeof request.body?.notes === "string" && request.body.notes.trim()
            ? request.body.notes.trim()
            : null;

        const entry = await prisma.weightEntry.create({
          data: {
            userId: request.user!.userId,
            weight,
            recordedAt,
            notes,
          },
        });

        reply.status(201).send({ weight: toDTO(entry) });
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({ error: "Failed to create weight entry" });
      }
    },
  );

  fastify.put<{ Params: { id: string }; Body: UpdateWeightBody }>(
    "/weights/:id",
    { preHandler: authenticateToken },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateWeightBody;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const existing = await prisma.weightEntry.findFirst({
          where: { id: request.params.id, userId: request.user!.userId },
        });
        if (!existing) {
          return reply.status(404).send({ error: "Registro não encontrado" });
        }

        const data: {
          weight?: number;
          recordedAt?: Date;
          notes?: string | null;
        } = {};

        if (request.body?.weight !== undefined) {
          const w = parseWeight(request.body.weight);
          if (w === null) {
            return reply.status(400).send({ error: "Peso inválido" });
          }
          data.weight = w;
        }

        if (request.body?.recordedAt !== undefined) {
          const d = parseDate(request.body.recordedAt);
          if (!d) {
            return reply.status(400).send({ error: "Data inválida" });
          }
          data.recordedAt = d;
        }

        if (request.body?.notes !== undefined) {
          if (request.body.notes === null || request.body.notes === "") {
            data.notes = null;
          } else if (typeof request.body.notes === "string") {
            data.notes = request.body.notes.trim() || null;
          }
        }

        const entry = await prisma.weightEntry.update({
          where: { id: existing.id },
          data,
        });

        reply.send({ weight: toDTO(entry) });
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({ error: "Failed to update weight entry" });
      }
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/weights/:id",
    { preHandler: authenticateToken },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const existing = await prisma.weightEntry.findFirst({
          where: { id: request.params.id, userId: request.user!.userId },
        });
        if (!existing) {
          return reply.status(404).send({ error: "Registro não encontrado" });
        }

        await prisma.weightEntry.delete({ where: { id: existing.id } });
        reply.status(204).send();
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({ error: "Failed to delete weight entry" });
      }
    },
  );
}
