import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import "./types/fastify"; // Import type augmentation
import { workoutRoutes } from "./routes/workouts";
import { exerciseRoutes } from "./routes/exercises";
import { goalsRoutes } from "./routes/goals";
import { authRoutes } from "./routes/auth";

const fastify = Fastify({
  logger: true,
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
  secret: process.env.COOKIE_SECRET ?? "change-this-in-production",
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
  allowedHeaders: ["Content-Type"],
});

// CSRF mitigation: reject mutating requests whose Origin is not allowlisted.
// SameSite=Lax cookies block cross-site cookie sends in most modern browsers,
// but verifying Origin closes residual gaps.
fastify.addHook("preHandler", async (request, reply) => {
  const method = request.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return;

  const origin = request.headers.origin;
  if (!origin) return; // non-browser client (curl, server-to-server)
  if (!isOriginAllowed(origin)) {
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
fastify.register(exerciseRoutes);
fastify.register(goalsRoutes);

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
