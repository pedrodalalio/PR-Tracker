import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { STRAVA_STATE_SECRET } from "../lib/env";
import { authenticateToken } from "../lib/middleware";
import { toRunDTO } from "./runs";
import {
  buildAuthorizeUrl,
  exchangeCode,
  listActivities,
  getActivity,
  getActivityStreams,
  deauthorize,
  getFrontendUrl,
  StravaError,
  type StravaActivitySummary,
} from "../lib/strava-client";

interface OAuthState {
  uid: string;
  nonce: string;
}

function signState(userId: string): string {
  const state: OAuthState = {
    uid: userId,
    nonce: Math.random().toString(36).slice(2),
  };
  return jwt.sign(state, STRAVA_STATE_SECRET, { expiresIn: "10m" });
}

function verifyState(token: string): OAuthState | null {
  try {
    return jwt.verify(token, STRAVA_STATE_SECRET) as OAuthState;
  } catch {
    return null;
  }
}

// Aceita só corridas/walks/trail. Strava tem outros sport_types que ignoramos.
const RUN_TYPES = new Set(["Run", "TrailRun", "VirtualRun", "Walk", "Hike"]);

interface StravaActivityDTO {
  id: number;
  name: string;
  type: string;
  sportType: string;
  distance: number;
  movingTime: number;
  elapsedTime: number;
  elevationGain: number;
  startDate: string;
  startDateLocal: string;
  averageSpeed: number;
  averageHeartrate: number | null;
  imported: boolean;
  importedRunId: string | null;
}

/**
 * Importa atividade do Strava para o banco como Run. Retorna o Run criado, ou
 * o Run existente se já importado (idempotente). Lança StravaError em falhas
 * de API; caller decide como responder.
 */
export async function importStravaActivityForUser(
  userId: string,
  stravaId: number,
): Promise<{ run: Awaited<ReturnType<typeof prisma.run.create>>; alreadyImported: boolean }> {
  const externalId = `strava:${stravaId}`;
  const existing = await prisma.run.findFirst({
    where: { userId, externalId },
  });
  if (existing) return { run: existing, alreadyImported: true };

  const [activity, streams] = await Promise.all([
    getActivity(userId, stravaId),
    getActivityStreams(userId, stravaId).catch(
      () => ({}) as Awaited<ReturnType<typeof getActivityStreams>>,
    ),
  ]);

  const startDate = new Date(activity.start_date);
  const endDate = new Date(startDate.getTime() + activity.elapsed_time * 1000);

  const latlng = streams.latlng?.data;
  const time = streams.time?.data;
  const altitude = streams.altitude?.data;
  const routePoints: Array<{
    lat: number;
    lng: number;
    ele?: number;
    t?: number;
  }> = [];
  if (latlng && Array.isArray(latlng)) {
    for (let i = 0; i < latlng.length; i++) {
      const p = latlng[i]!;
      routePoints.push({
        lat: p[0],
        lng: p[1],
        ele:
          altitude && typeof altitude[i] === "number" ? altitude[i] : undefined,
        t: time && typeof time[i] === "number" ? time[i] : undefined,
      });
    }
  }

  const splits =
    activity.splits_metric?.map((s) => ({
      km: s.split,
      duration: s.moving_time,
      pace: s.distance > 0 ? s.moving_time / (s.distance / 1000) : 0,
    })) ?? [];

  const pace =
    activity.distance > 0 && activity.moving_time > 0
      ? activity.moving_time / (activity.distance / 1000)
      : null;

  const run = await prisma.run.create({
    data: {
      userId,
      name: activity.name?.trim() || null,
      date: startDate,
      startTime: startDate,
      endTime: endDate,
      distance: activity.distance,
      duration: activity.elapsed_time,
      movingTime: activity.moving_time,
      pace,
      elevationGain: activity.total_elevation_gain ?? null,
      notes: activity.description?.trim() || null,
      source: "strava",
      externalId,
      routePoints: routePoints.length
        ? (routePoints as unknown as object)
        : undefined,
      splits: splits.length ? (splits as unknown as object) : undefined,
    },
  });
  return { run, alreadyImported: false };
}

function summaryToDTO(
  s: StravaActivitySummary,
  importedRunId: string | null,
): StravaActivityDTO {
  return {
    id: s.id,
    name: s.name,
    type: s.type,
    sportType: s.sport_type,
    distance: s.distance,
    movingTime: s.moving_time,
    elapsedTime: s.elapsed_time,
    elevationGain: s.total_elevation_gain,
    startDate: s.start_date,
    startDateLocal: s.start_date_local,
    averageSpeed: s.average_speed,
    averageHeartrate: s.average_heartrate ?? null,
    imported: importedRunId !== null,
    importedRunId,
  };
}

export async function stravaRoutes(fastify: FastifyInstance) {
  // Status da conexão (sem expor tokens)
  fastify.get(
    "/strava/status",
    { preHandler: authenticateToken },
    async (request: FastifyRequest) => {
      const conn = await prisma.stravaConnection.findUnique({
        where: { userId: request.user!.userId },
        select: { athleteId: true, scope: true, createdAt: true },
      });
      return {
        connected: !!conn,
        athleteId: conn ? Number(conn.athleteId) : null,
        scope: conn?.scope ?? null,
        connectedAt: conn?.createdAt.toISOString() ?? null,
      };
    },
  );

  // Inicia o OAuth — frontend deve redirecionar a janela pra esse URL
  fastify.post(
    "/strava/authorize",
    { preHandler: authenticateToken },
    async (request: FastifyRequest) => {
      const state = signState(request.user!.userId);
      return { url: buildAuthorizeUrl(state) };
    },
  );

  // Callback do Strava — não autenticado por JWT, usa state assinado
  fastify.get<{
    Querystring: {
      code?: string;
      state?: string;
      scope?: string;
      error?: string;
    };
  }>(
    "/strava/callback",
    async (
      request: FastifyRequest<{
        Querystring: {
          code?: string;
          state?: string;
          scope?: string;
          error?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      const frontend = getFrontendUrl();
      const { code, state, scope, error } = request.query;

      if (error) {
        return reply.redirect(
          `${frontend}/runs?strava_error=${encodeURIComponent(error)}`,
        );
      }
      if (!code || !state) {
        return reply.redirect(
          `${frontend}/runs?strava_error=missing_params`,
        );
      }

      const decoded = verifyState(state);
      if (!decoded) {
        return reply.redirect(
          `${frontend}/runs?strava_error=invalid_state`,
        );
      }

      try {
        const tokens = await exchangeCode(code);
        if (!tokens.athlete?.id) {
          throw new StravaError("Strava não retornou athlete ID");
        }
        await prisma.stravaConnection.upsert({
          where: { userId: decoded.uid },
          create: {
            userId: decoded.uid,
            athleteId: BigInt(tokens.athlete.id),
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: new Date(tokens.expires_at * 1000),
            scope: scope ?? tokens.scope ?? "read,activity:read_all",
          },
          update: {
            athleteId: BigInt(tokens.athlete.id),
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresAt: new Date(tokens.expires_at * 1000),
            scope: scope ?? tokens.scope ?? "read,activity:read_all",
          },
        });
        return reply.redirect(`${frontend}/runs?strava_connected=1`);
      } catch (err) {
        request.log.error(err);
        const msg = err instanceof Error ? err.message : "unknown";
        return reply.redirect(
          `${frontend}/runs?strava_error=${encodeURIComponent(msg)}`,
        );
      }
    },
  );

  // Desconecta
  fastify.post(
    "/strava/disconnect",
    { preHandler: authenticateToken },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await deauthorize(request.user!.userId);
        return { ok: true };
      } catch (err) {
        request.log.error(err);
        return reply.status(500).send({ error: "Falha ao desconectar" });
      }
    },
  );

  // Lista atividades do usuário no Strava (paginadas)
  fastify.get<{ Querystring: { page?: string; perPage?: string } }>(
    "/strava/activities",
    { preHandler: authenticateToken },
    async (
      request: FastifyRequest<{
        Querystring: { page?: string; perPage?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const userId = request.user!.userId;
      const page = Math.max(1, Number(request.query.page) || 1);
      const perPage = Math.min(
        50,
        Math.max(5, Number(request.query.perPage) || 30),
      );

      try {
        const activities = await listActivities(userId, page, perPage);

        // Filtra só corridas/walks
        const runs = activities.filter((a) => RUN_TYPES.has(a.sport_type));

        // Cross-reference com Run.externalId pra marcar já importadas
        const stravaIds = runs.map((a) => `strava:${a.id}`);
        const imported = stravaIds.length
          ? await prisma.run.findMany({
              where: { userId, externalId: { in: stravaIds } },
              select: { id: true, externalId: true },
            })
          : [];
        const importedMap = new Map(
          imported.map((r) => [r.externalId, r.id] as const),
        );

        return runs.map((a) =>
          summaryToDTO(a, importedMap.get(`strava:${a.id}`) ?? null),
        );
      } catch (err) {
        if (err instanceof StravaError) {
          return reply.status(err.status ?? 500).send({ error: err.message });
        }
        request.log.error(err);
        return reply.status(500).send({ error: "Falha ao listar atividades" });
      }
    },
  );

  // Importa uma atividade — pega detalhe + streams e cria Run
  fastify.post<{ Body: { id: number } }>(
    "/strava/import",
    { preHandler: authenticateToken },
    async (
      request: FastifyRequest<{ Body: { id: number } }>,
      reply: FastifyReply,
    ) => {
      const userId = request.user!.userId;
      const stravaId = Number(request.body?.id);
      if (!Number.isInteger(stravaId) || stravaId <= 0) {
        return reply.status(400).send({ error: "ID inválido" });
      }
      try {
        const result = await importStravaActivityForUser(userId, stravaId);
        return reply
          .status(result.alreadyImported ? 200 : 201)
          .send({
            run: toRunDTO(result.run),
            alreadyImported: result.alreadyImported,
          });
      } catch (err) {
        if (err instanceof StravaError) {
          return reply.status(err.status ?? 500).send({ error: err.message });
        }
        request.log.error(err);
        return reply
          .status(500)
          .send({ error: "Falha ao importar atividade" });
      }
    },
  );

  // Webhook do Strava: GET é o handshake de validação (a Strava manda um
  // hub.challenge que precisamos ecoar), POST recebe os eventos.
  // Doc: https://developers.strava.com/docs/webhooks/
  fastify.get<{
    Querystring: {
      "hub.mode"?: string;
      "hub.verify_token"?: string;
      "hub.challenge"?: string;
    };
  }>(
    "/strava/webhook",
    async (request, reply) => {
      const verifyToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
      const q = request.query;
      if (
        q["hub.mode"] === "subscribe" &&
        verifyToken &&
        q["hub.verify_token"] === verifyToken &&
        q["hub.challenge"]
      ) {
        return reply.send({ "hub.challenge": q["hub.challenge"] });
      }
      return reply.status(403).send({ error: "Forbidden" });
    },
  );

  fastify.post<{
    Body: {
      object_type?: string;
      object_id?: number;
      aspect_type?: string;
      owner_id?: number;
    };
  }>(
    "/strava/webhook",
    async (request, reply) => {
      const event = request.body;
      // Responde 200 logo — Strava espera <2s ou marca a subscription como
      // unhealthy. Processamento real fica em background.
      reply.status(200).send({ ok: true });

      if (
        event?.object_type !== "activity" ||
        event?.aspect_type !== "create" ||
        typeof event?.object_id !== "number" ||
        typeof event?.owner_id !== "number"
      ) {
        return;
      }

      const ownerId = event.owner_id;
      const activityId = event.object_id;

      // Roda o import sem await: o reply já foi enviado.
      (async () => {
        try {
          const conn = await prisma.stravaConnection.findFirst({
            where: { athleteId: BigInt(ownerId) },
            select: { userId: true },
          });
          if (!conn) {
            request.log.warn(
              { ownerId },
              "webhook: no Strava connection for owner_id",
            );
            return;
          }
          await importStravaActivityForUser(conn.userId, activityId);
        } catch (err) {
          request.log.error({ err, ownerId, activityId }, "webhook import failed");
        }
      })();
    },
  );
}
