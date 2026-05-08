import { prisma } from "./prisma";
import type { StravaConnection } from "../generated/prisma";

const STRAVA_API = "https://www.strava.com/api/v3";
const STRAVA_OAUTH = "https://www.strava.com/oauth";

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix seconds
  token_type: "Bearer";
  athlete?: { id: number };
  scope?: string;
}

export interface StravaActivitySummary {
  id: number;
  name: string;
  type: string; // "Run", "TrailRun", "Walk", etc.
  sport_type: string;
  distance: number; // metros
  moving_time: number; // segundos
  elapsed_time: number; // segundos
  total_elevation_gain: number; // metros
  start_date: string; // ISO
  start_date_local: string;
  average_speed: number; // m/s
  max_speed: number;
  has_heartrate?: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  start_latlng?: [number, number] | null;
  end_latlng?: [number, number] | null;
}

export interface StravaActivityDetail extends StravaActivitySummary {
  description?: string | null;
  splits_metric?: Array<{
    distance: number;
    elapsed_time: number;
    moving_time: number;
    elevation_difference: number;
    average_speed: number;
    split: number;
  }>;
}

export interface StravaStreams {
  time?: { data: number[] }; // segundos desde start
  latlng?: { data: [number, number][] };
  distance?: { data: number[] }; // cumulativa, metros
  altitude?: { data: number[] };
}

export class StravaError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "StravaError";
  }
}

function getCreds() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new StravaError(
      "STRAVA_CLIENT_ID/SECRET não configurados no backend",
    );
  }
  return { clientId, clientSecret };
}

export function getRedirectUri(): string {
  return (
    process.env.STRAVA_REDIRECT_URI ?? "http://localhost:3000/strava/callback"
  );
}

export function getFrontendUrl(): string {
  return process.env.FRONTEND_URL ?? "http://localhost:5173";
}

export function buildAuthorizeUrl(state: string): string {
  const { clientId } = getCreds();
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: getRedirectUri(),
    approval_prompt: "auto",
    scope: "read,activity:read_all",
    state,
  });
  return `${STRAVA_OAUTH}/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = getCreds();
  const res = await fetch(`${STRAVA_OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new StravaError(`Falha ao trocar código: ${txt}`, res.status);
  }
  return (await res.json()) as StravaTokenResponse;
}

async function refreshTokens(
  connection: StravaConnection,
): Promise<StravaConnection> {
  const { clientId, clientSecret } = getCreds();
  const res = await fetch(`${STRAVA_OAUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new StravaError(`Falha ao renovar token: ${txt}`, res.status);
  }
  const data = (await res.json()) as StravaTokenResponse;
  return prisma.stravaConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at * 1000),
    },
  });
}

async function getValidAccessToken(userId: string): Promise<string> {
  let conn = await prisma.stravaConnection.findUnique({ where: { userId } });
  if (!conn) {
    throw new StravaError("Strava não conectado", 401);
  }
  // Renova se vence em <60s
  if (conn.expiresAt.getTime() - Date.now() < 60_000) {
    conn = await refreshTokens(conn);
  }
  return conn.accessToken;
}

async function stravaFetch<T>(
  userId: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await getValidAccessToken(userId);
  const res = await fetch(`${STRAVA_API}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  });
  if (res.status === 401) {
    throw new StravaError("Token inválido — reconecte o Strava", 401);
  }
  if (res.status === 429) {
    throw new StravaError("Limite da API do Strava atingido — tente em 15min", 429);
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new StravaError(`Strava ${res.status}: ${txt}`, res.status);
  }
  return (await res.json()) as T;
}

export async function listActivities(
  userId: string,
  page: number,
  perPage: number = 30,
): Promise<StravaActivitySummary[]> {
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
  });
  return stravaFetch<StravaActivitySummary[]>(
    userId,
    `/athlete/activities?${params.toString()}`,
  );
}

export async function getActivity(
  userId: string,
  id: number,
): Promise<StravaActivityDetail> {
  return stravaFetch<StravaActivityDetail>(
    userId,
    `/activities/${id}?include_all_efforts=false`,
  );
}

export async function getActivityStreams(
  userId: string,
  id: number,
): Promise<StravaStreams> {
  const params = new URLSearchParams({
    keys: "time,latlng,distance,altitude",
    key_by_type: "true",
  });
  return stravaFetch<StravaStreams>(
    userId,
    `/activities/${id}/streams?${params.toString()}`,
  );
}

export async function deauthorize(userId: string): Promise<void> {
  // O endpoint de deauthorize é em www.strava.com, não em /api/v3
  try {
    const token = await getValidAccessToken(userId);
    await fetch(`${STRAVA_OAUTH}/deauthorize`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // se falhar, segue removendo localmente — o usuário pode revogar pelo Strava direto
  }
  await prisma.stravaConnection.deleteMany({ where: { userId } });
}
