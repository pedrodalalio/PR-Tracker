import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import "./types/fastify"; // Import type augmentation
import { COOKIE_SECRET } from "./lib/env";
import { AuthService } from "./lib/auth";
import { REFRESH_COOKIE } from "./lib/cookies";
import { workoutRoutes } from "./routes/workouts";
import { workoutTemplateRoutes } from "./routes/workout-templates";
import { exerciseRoutes } from "./routes/exercises";
import { goalsRoutes } from "./routes/goals";
import { authRoutes } from "./routes/auth";
import { weightsRoutes } from "./routes/weights";
import { runsRoutes } from "./routes/runs";
import { stravaRoutes } from "./routes/strava";

const fastify = Fastify({
  logger: true,
  // 10 MB: large enough for GPX imports with thousands of routePoints,
  // but keeps Fastify's 1 MB default from being abused on other routes.
  bodyLimit: 10 * 1024 * 1024,
});

const isProd = process.env.NODE_ENV === "production";

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173,http://localhost:4173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// Em desenvolvimento, aceita qualquer porta de localhost/127.0.0.1 e IPs de rede privada
// (10.x, 172.16-31.x, 192.168.x) pra permitir abrir o frontend pelo celular no mesmo Wi-Fi.
function isOriginAllowed(origin: string): boolean {
  if (allowedOrigins.includes(origin)) return true;
  if (isProd) return false;
  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    if (/^10\./.test(hostname)) return true;
    if (/^192\.168\./.test(hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

fastify.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
});

fastify.register(cookie, {
  secret: COOKIE_SECRET,
});

// Rate limiting: opt-in per route (global: false). Routes that need throttling
// declare their own limits via config.rateLimit.
fastify.register(rateLimit, {
  global: false,
});

fastify.register(cors, {
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (isOriginAllowed(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("Not allowed"), false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
});

// CSRF mitigation: reject mutating requests whose Origin is not allowlisted.
// Cookie-authenticated routes require a present, allowlisted Origin (no bypass)
// because the refresh cookie is ambient-authority. Bearer-only requests may omit
// Origin (CLI/server-to-server) since the bearer token isn't ambient.
fastify.addHook("preHandler", async (request, reply) => {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const origin = request.headers.origin;
  const hasRefreshCookie = !!request.cookies?.[REFRESH_COOKIE];

  if (hasRefreshCookie) {
    if (!origin || !isOriginAllowed(origin)) {
      return reply.status(403).send({ error: "Origin not allowed" });
    }
    return;
  }

  if (origin && !isOriginAllowed(origin)) {
    return reply.status(403).send({ error: "Origin not allowed" });
  }
});

fastify.get("/", async () => {
  return { message: "Gym Stats Tracker API is running!" };
});

fastify.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() };
});

fastify.register(authRoutes);
fastify.register(workoutRoutes);
fastify.register(workoutTemplateRoutes);
fastify.register(exerciseRoutes);
fastify.register(goalsRoutes);
fastify.register(weightsRoutes);
fastify.register(runsRoutes);
fastify.register(stravaRoutes);

// Limpa refresh tokens expirados/revogados a cada 24h. Roda 1x no boot.
const TOKEN_CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;
function scheduleRefreshTokenCleanup() {
  void AuthService.cleanExpiredTokens();
  const timer = setInterval(() => {
    void AuthService.cleanExpiredTokens();
  }, TOKEN_CLEANUP_INTERVAL_MS);
  // Não segura o event loop em shutdown.
  if (typeof timer.unref === "function") timer.unref();
}

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    scheduleRefreshTokenCleanup();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
