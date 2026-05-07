import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma";
import { authenticateToken } from "../lib/middleware";

interface RoutePointInput {
  lat: number;
  lng: number;
  ele?: number;
  t?: number;
}

interface SplitInput {
  km: number;
  duration: number;
  pace: number;
}

interface CreateRunBody {
  name?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  distance: number;
  duration: number;
  pace?: number;
  elevationGain?: number;
  notes?: string;
  source?: string;
  externalId?: string;
  routePoints?: RoutePointInput[];
  splits?: SplitInput[];
}

interface UpdateRunBody {
  name?: string | null;
  date?: string;
  startTime?: string | null;
  endTime?: string | null;
  distance?: number;
  duration?: number;
  pace?: number;
  elevationGain?: number | null;
  notes?: string | null;
  routePoints?: RoutePointInput[] | null;
  splits?: SplitInput[] | null;
}

interface RunDTO {
  id: string;
  name: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  distance: number;
  duration: number;
  pace: number | null;
  elevationGain: number | null;
  notes: string | null;
  source: string;
  externalId: string | null;
  routePoints: RoutePointInput[] | null;
  splits: SplitInput[] | null;
  createdAt: string;
  updatedAt: string;
}

function toDTO(run: {
  id: string;
  name: string | null;
  date: Date;
  startTime: Date | null;
  endTime: Date | null;
  distance: number;
  duration: number;
  pace: number | null;
  elevationGain: number | null;
  notes: string | null;
  source: string;
  externalId: string | null;
  routePoints: unknown;
  splits: unknown;
  createdAt: Date;
  updatedAt: Date;
}): RunDTO {
  return {
    id: run.id,
    name: run.name,
    date: run.date.toISOString(),
    startTime: run.startTime?.toISOString() ?? null,
    endTime: run.endTime?.toISOString() ?? null,
    distance: run.distance,
    duration: run.duration,
    pace: run.pace,
    elevationGain: run.elevationGain,
    notes: run.notes,
    source: run.source,
    externalId: run.externalId,
    routePoints: (run.routePoints as RoutePointInput[] | null) ?? null,
    splits: (run.splits as SplitInput[] | null) ?? null,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString(),
  };
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function calculatePaceSecPerKm(distance: number, duration: number): number {
  // pace = seconds per km
  if (distance <= 0) return 0;
  return duration / (distance / 1000);
}

export async function runsRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/runs",
    { preHandler: authenticateToken },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const runs = await prisma.run.findMany({
          where: { userId: request.user!.userId },
          orderBy: { date: "desc" },
        });
        reply.send(runs.map(toDTO));
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({ error: "Failed to fetch runs" });
      }
    },
  );

  fastify.get<{ Params: { id: string } }>(
    "/runs/:id",
    { preHandler: authenticateToken },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const run = await prisma.run.findFirst({
          where: { id: request.params.id, userId: request.user!.userId },
        });
        if (!run) {
          return reply.status(404).send({ error: "Corrida não encontrada" });
        }
        reply.send(toDTO(run));
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({ error: "Failed to fetch run" });
      }
    },
  );

  fastify.post<{ Body: CreateRunBody }>(
    "/runs",
    { preHandler: authenticateToken },
    async (
      request: FastifyRequest<{ Body: CreateRunBody }>,
      reply: FastifyReply,
    ) => {
      try {
        const body = request.body;

        const date = parseDate(body?.date);
        if (!date) {
          return reply.status(400).send({ error: "Data inválida" });
        }

        const distance = Number(body?.distance);
        const duration = Number(body?.duration);
        if (!Number.isFinite(distance) || distance <= 0) {
          return reply.status(400).send({ error: "Distância inválida" });
        }
        if (!Number.isFinite(duration) || duration <= 0) {
          return reply.status(400).send({ error: "Duração inválida" });
        }

        const pace =
          body?.pace !== undefined
            ? Number(body.pace)
            : calculatePaceSecPerKm(distance, duration);

        const startTime = body?.startTime ? parseDate(body.startTime) : null;
        const endTime = body?.endTime ? parseDate(body.endTime) : null;

        const elevationGain =
          body?.elevationGain !== undefined && body.elevationGain !== null
            ? Number(body.elevationGain)
            : null;

        const run = await prisma.run.create({
          data: {
            userId: request.user!.userId,
            name: body?.name?.trim() || null,
            date,
            startTime,
            endTime,
            distance,
            duration: Math.round(duration),
            pace: Number.isFinite(pace) ? pace : null,
            elevationGain:
              elevationGain !== null && Number.isFinite(elevationGain)
                ? elevationGain
                : null,
            notes: body?.notes?.trim() || null,
            source: body?.source?.trim() || "manual",
            externalId: body?.externalId ?? null,
            routePoints: (body?.routePoints as object) ?? undefined,
            splits: (body?.splits as object) ?? undefined,
          },
        });

        reply.status(201).send(toDTO(run));
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({ error: "Failed to create run" });
      }
    },
  );

  fastify.put<{ Params: { id: string }; Body: UpdateRunBody }>(
    "/runs/:id",
    { preHandler: authenticateToken },
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: UpdateRunBody;
      }>,
      reply: FastifyReply,
    ) => {
      try {
        const existing = await prisma.run.findFirst({
          where: { id: request.params.id, userId: request.user!.userId },
        });
        if (!existing) {
          return reply.status(404).send({ error: "Corrida não encontrada" });
        }

        const body = request.body;
        const data: Record<string, unknown> = {};

        if (body?.name !== undefined) {
          data.name = body.name?.toString().trim() || null;
        }
        if (body?.date !== undefined) {
          const d = parseDate(body.date);
          if (!d) return reply.status(400).send({ error: "Data inválida" });
          data.date = d;
        }
        if (body?.startTime !== undefined) {
          data.startTime = body.startTime ? parseDate(body.startTime) : null;
        }
        if (body?.endTime !== undefined) {
          data.endTime = body.endTime ? parseDate(body.endTime) : null;
        }
        if (body?.distance !== undefined) {
          const n = Number(body.distance);
          if (!Number.isFinite(n) || n <= 0) {
            return reply.status(400).send({ error: "Distância inválida" });
          }
          data.distance = n;
        }
        if (body?.duration !== undefined) {
          const n = Number(body.duration);
          if (!Number.isFinite(n) || n <= 0) {
            return reply.status(400).send({ error: "Duração inválida" });
          }
          data.duration = Math.round(n);
        }
        if (body?.pace !== undefined) {
          const n = Number(body.pace);
          data.pace = Number.isFinite(n) ? n : null;
        }
        if (body?.elevationGain !== undefined) {
          if (body.elevationGain === null) {
            data.elevationGain = null;
          } else {
            const n = Number(body.elevationGain);
            data.elevationGain = Number.isFinite(n) ? n : null;
          }
        }
        if (body?.notes !== undefined) {
          data.notes = body.notes?.toString().trim() || null;
        }
        if (body?.routePoints !== undefined) {
          data.routePoints = body.routePoints ?? null;
        }
        if (body?.splits !== undefined) {
          data.splits = body.splits ?? null;
        }

        // Recalcula pace se distance/duration mudaram e pace não foi enviado
        if (
          (data.distance !== undefined || data.duration !== undefined) &&
          body?.pace === undefined
        ) {
          const dist =
            (data.distance as number | undefined) ?? existing.distance;
          const dur =
            (data.duration as number | undefined) ?? existing.duration;
          data.pace = calculatePaceSecPerKm(dist, dur);
        }

        const run = await prisma.run.update({
          where: { id: existing.id },
          data,
        });

        reply.send(toDTO(run));
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({ error: "Failed to update run" });
      }
    },
  );

  fastify.delete<{ Params: { id: string } }>(
    "/runs/:id",
    { preHandler: authenticateToken },
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply,
    ) => {
      try {
        const existing = await prisma.run.findFirst({
          where: { id: request.params.id, userId: request.user!.userId },
        });
        if (!existing) {
          return reply.status(404).send({ error: "Corrida não encontrada" });
        }

        await prisma.run.delete({ where: { id: existing.id } });
        reply.status(204).send();
      } catch (error) {
        request.log.error(error);
        reply.status(500).send({ error: "Failed to delete run" });
      }
    },
  );
}
