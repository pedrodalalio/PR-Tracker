import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../lib/prisma";
import { authenticateToken } from "../lib/middleware";

interface WeightEntryDTO {
  id: string;
  weight: number;
  recordedAt: string;
  notes: string | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  maintenanceKcal: number | null;
  metabolicAge: number | null;
  visceralFat: number | null;
  bmi: number | null;
  createdAt: string;
  updatedAt: string;
}

interface BioimpedanceInput {
  bodyFatPct?: number | string | null;
  muscleMassKg?: number | string | null;
  maintenanceKcal?: number | string | null;
  metabolicAge?: number | string | null;
  visceralFat?: number | string | null;
  bmi?: number | string | null;
}

interface CreateWeightBody extends BioimpedanceInput {
  weight: number;
  recordedAt?: string;
  notes?: string;
}

interface UpdateWeightBody extends BioimpedanceInput {
  weight?: number;
  recordedAt?: string;
  notes?: string | null;
}

function toDTO(entry: {
  id: string;
  weight: number;
  recordedAt: Date;
  notes: string | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  maintenanceKcal: number | null;
  metabolicAge: number | null;
  visceralFat: number | null;
  bmi: number | null;
  createdAt: Date;
  updatedAt: Date;
}): WeightEntryDTO {
  return {
    id: entry.id,
    weight: entry.weight,
    recordedAt: entry.recordedAt.toISOString(),
    notes: entry.notes,
    bodyFatPct: entry.bodyFatPct,
    muscleMassKg: entry.muscleMassKg,
    maintenanceKcal: entry.maintenanceKcal,
    metabolicAge: entry.metabolicAge,
    visceralFat: entry.visceralFat,
    bmi: entry.bmi,
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

// Cada métrica de bioimpedância: undefined = não tocar, null = limpar,
// número válido = setar. Strings vazias caem como "limpar".
type FloatField = "bodyFatPct" | "muscleMassKg" | "visceralFat" | "bmi";
type IntField = "maintenanceKcal" | "metabolicAge";

const FLOAT_BOUNDS: Record<FloatField, { min: number; max: number; decimals: number }> = {
  bodyFatPct: { min: 0, max: 100, decimals: 1 },
  muscleMassKg: { min: 0, max: 500, decimals: 1 },
  visceralFat: { min: 0, max: 100, decimals: 1 },
  bmi: { min: 0, max: 100, decimals: 1 },
};

const INT_BOUNDS: Record<IntField, { min: number; max: number }> = {
  maintenanceKcal: { min: 0, max: 10000 },
  metabolicAge: { min: 0, max: 150 },
};

type ParsedFloat = { ok: true; value: number | null } | { ok: false };
type ParsedInt = { ok: true; value: number | null } | { ok: false };

function parseOptionalFloat(value: unknown, field: FloatField): ParsedFloat {
  if (value === undefined) return { ok: true, value: null }; // caller decides
  if (value === null || value === "") return { ok: true, value: null };
  const n = typeof value === "string" ? Number(value.replace(",", ".")) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return { ok: false };
  const { min, max, decimals } = FLOAT_BOUNDS[field];
  if (n < min || n > max) return { ok: false };
  const factor = 10 ** decimals;
  return { ok: true, value: Math.round(n * factor) / factor };
}

function parseOptionalInt(value: unknown, field: IntField): ParsedInt {
  if (value === undefined) return { ok: true, value: null };
  if (value === null || value === "") return { ok: true, value: null };
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n)) return { ok: false };
  const rounded = Math.round(n);
  const { min, max } = INT_BOUNDS[field];
  if (rounded < min || rounded > max) return { ok: false };
  return { ok: true, value: rounded };
}

// Para create: undefined vira null. Retorna `null` quando algum campo é inválido.
function parseBioForCreate(body: BioimpedanceInput): {
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  maintenanceKcal: number | null;
  metabolicAge: number | null;
  visceralFat: number | null;
  bmi: number | null;
} | { error: string } {
  const fat = parseOptionalFloat(body.bodyFatPct, "bodyFatPct");
  if (!fat.ok) return { error: "Gordura corporal inválida (0–100%)" };
  const muscle = parseOptionalFloat(body.muscleMassKg, "muscleMassKg");
  if (!muscle.ok) return { error: "Massa muscular inválida (kg)" };
  const visc = parseOptionalFloat(body.visceralFat, "visceralFat");
  if (!visc.ok) return { error: "Gordura visceral inválida" };
  const bmi = parseOptionalFloat(body.bmi, "bmi");
  if (!bmi.ok) return { error: "IMC inválido" };
  const kcal = parseOptionalInt(body.maintenanceKcal, "maintenanceKcal");
  if (!kcal.ok) return { error: "Calorias de manutenção inválidas" };
  const age = parseOptionalInt(body.metabolicAge, "metabolicAge");
  if (!age.ok) return { error: "Idade metabólica inválida" };
  return {
    bodyFatPct: fat.value,
    muscleMassKg: muscle.value,
    maintenanceKcal: kcal.value,
    metabolicAge: age.value,
    visceralFat: visc.value,
    bmi: bmi.value,
  };
}

// Para update: aplica apenas chaves presentes no body (preserva o que não veio).
function applyBioForUpdate(
  body: BioimpedanceInput,
  target: Record<string, unknown>,
): { error: string } | null {
  const checks: Array<[keyof BioimpedanceInput, () => ParsedFloat | ParsedInt, string]> = [
    ["bodyFatPct", () => parseOptionalFloat(body.bodyFatPct, "bodyFatPct"), "Gordura corporal inválida (0–100%)"],
    ["muscleMassKg", () => parseOptionalFloat(body.muscleMassKg, "muscleMassKg"), "Massa muscular inválida (kg)"],
    ["visceralFat", () => parseOptionalFloat(body.visceralFat, "visceralFat"), "Gordura visceral inválida"],
    ["bmi", () => parseOptionalFloat(body.bmi, "bmi"), "IMC inválido"],
    ["maintenanceKcal", () => parseOptionalInt(body.maintenanceKcal, "maintenanceKcal"), "Calorias de manutenção inválidas"],
    ["metabolicAge", () => parseOptionalInt(body.metabolicAge, "metabolicAge"), "Idade metabólica inválida"],
  ];
  for (const [key, parser, errMsg] of checks) {
    if (!(key in body)) continue;
    const parsed = parser();
    if (!parsed.ok) return { error: errMsg };
    target[key as string] = parsed.value;
  }
  return null;
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

        const bio = parseBioForCreate(request.body ?? {});
        if ("error" in bio) {
          return reply.status(400).send({ error: bio.error });
        }

        const entry = await prisma.weightEntry.create({
          data: {
            userId: request.user!.userId,
            weight,
            recordedAt,
            notes,
            ...bio,
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

        const data: Record<string, unknown> = {};

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

        const bioErr = applyBioForUpdate(request.body ?? {}, data);
        if (bioErr) {
          return reply.status(400).send({ error: bioErr.error });
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
