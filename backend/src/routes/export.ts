import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { authenticateToken } from "../lib/middleware";
import { prisma } from "../lib/prisma";

type Resource = "workouts" | "runs" | "weights";
type Format = "csv" | "json";

function isResource(value: string): value is Resource {
  return value === "workouts" || value === "runs" || value === "weights";
}

function isFormat(value: string): value is Format {
  return value === "csv" || value === "json";
}

// CSV: escape conservador. Sempre cita campos com vírgula, quebra de linha,
// aspas ou ponto-vírgula (alguns locales abrem CSV com `;` como delimitador).
function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s =
    value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const header = columns.join(",");
  const body = rows
    .map((row) => columns.map((c) => csvEscape(row[c])).join(","))
    .join("\n");
  return body ? `${header}\n${body}\n` : `${header}\n`;
}

function sendDownload(
  reply: FastifyReply,
  filename: string,
  contentType: string,
  body: string,
) {
  reply.header("Content-Type", `${contentType}; charset=utf-8`);
  reply.header(
    "Content-Disposition",
    `attachment; filename="${filename}"`,
  );
  reply.send(body);
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

async function exportWorkouts(userId: string) {
  const workouts = await prisma.workout.findMany({
    where: { userId },
    include: { exercises: { include: { exercise: true, sets: true } } },
    orderBy: { date: "desc" },
  });
  // CSV é flat: 1 linha por set. JSON preserva a estrutura aninhada.
  const csvRows: Array<Record<string, unknown>> = [];
  for (const w of workouts) {
    for (const we of w.exercises) {
      if (we.sets.length === 0) {
        csvRows.push({
          date: w.date.toISOString().slice(0, 10),
          workoutName: w.name,
          workoutType: w.workoutType,
          exercise: we.exercise.name,
          exerciseCategory: we.exercise.category,
          setIndex: "",
          reps: "",
          weightKg: "",
          notes: we.notes ?? w.notes ?? "",
        });
        continue;
      }
      we.sets.forEach((s, i) => {
        csvRows.push({
          date: w.date.toISOString().slice(0, 10),
          workoutName: w.name,
          workoutType: w.workoutType,
          exercise: we.exercise.name,
          exerciseCategory: we.exercise.category,
          setIndex: i + 1,
          reps: s.reps,
          weightKg: s.weight,
          notes: i === 0 ? we.notes ?? w.notes ?? "" : "",
        });
      });
    }
  }
  return {
    csv: toCsv(csvRows, [
      "date",
      "workoutName",
      "workoutType",
      "exercise",
      "exerciseCategory",
      "setIndex",
      "reps",
      "weightKg",
      "notes",
    ]),
    json: workouts,
  };
}

async function exportRuns(userId: string) {
  const runs = await prisma.run.findMany({
    where: { userId },
    orderBy: { date: "desc" },
  });
  const csvRows = runs.map((r) => ({
    date: r.date.toISOString().slice(0, 10),
    name: r.name ?? "",
    distanceMeters: r.distance,
    durationSeconds: r.duration,
    movingTimeSeconds: r.movingTime ?? "",
    pace: r.pace ?? "",
    source: r.source,
    notes: r.notes ?? "",
  }));
  return {
    csv: toCsv(csvRows, [
      "date",
      "name",
      "distanceMeters",
      "durationSeconds",
      "movingTimeSeconds",
      "pace",
      "source",
      "notes",
    ]),
    json: runs,
  };
}

async function exportWeights(userId: string) {
  const weights = await prisma.weightEntry.findMany({
    where: { userId },
    orderBy: { recordedAt: "desc" },
  });
  const csvRows = weights.map((w) => ({
    recordedAt: w.recordedAt.toISOString(),
    weightKg: w.weight,
    bodyFatPct: w.bodyFatPct ?? "",
    muscleMassKg: w.muscleMassKg ?? "",
    bmi: w.bmi ?? "",
    visceralFat: w.visceralFat ?? "",
    maintenanceKcal: w.maintenanceKcal ?? "",
    metabolicAge: w.metabolicAge ?? "",
    notes: w.notes ?? "",
  }));
  return {
    csv: toCsv(csvRows, [
      "recordedAt",
      "weightKg",
      "bodyFatPct",
      "muscleMassKg",
      "bmi",
      "visceralFat",
      "maintenanceKcal",
      "metabolicAge",
      "notes",
    ]),
    json: weights,
  };
}

export async function exportRoutes(fastify: FastifyInstance) {
  fastify.get<{ Params: { file: string } }>(
    "/export/:file",
    { preHandler: authenticateToken },
    async (request: FastifyRequest<{ Params: { file: string } }>, reply) => {
      const { file } = request.params;
      // file é tipo "workouts.csv". Split no último ponto.
      const dot = file.lastIndexOf(".");
      if (dot === -1) {
        return reply.status(400).send({ error: "Formato inválido" });
      }
      const resource = file.slice(0, dot);
      const format = file.slice(dot + 1);
      if (!isResource(resource) || !isFormat(format)) {
        return reply.status(400).send({ error: "Recurso ou formato inválido" });
      }

      try {
        const userId = request.user!.userId;
        const data =
          resource === "workouts"
            ? await exportWorkouts(userId)
            : resource === "runs"
              ? await exportRuns(userId)
              : await exportWeights(userId);

        const filename = `pr-tracker-${resource}-${todayStamp()}.${format}`;
        if (format === "csv") {
          return sendDownload(reply, filename, "text/csv", data.csv);
        }
        return sendDownload(
          reply,
          filename,
          "application/json",
          JSON.stringify(data.json, null, 2),
        );
      } catch (error) {
        request.log.error(error);
        return reply.status(500).send({ error: "Falha ao exportar" });
      }
    },
  );
}
