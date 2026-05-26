import { FastifyRequest } from "fastify";
import { prisma } from "./prisma";

export type AuthEventType =
  | "login_success"
  | "login_failed"
  | "register"
  | "password_reset_request"
  | "password_reset_complete"
  | "password_changed"
  | "email_verified"
  | "account_deleted";

interface LogParams {
  request?: FastifyRequest;
  userId?: string | null;
  eventType: AuthEventType;
  email?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget. Logging falhando nunca deve bloquear o fluxo de auth — o
 * usuário ainda consegue logar/registrar mesmo se o INSERT falhar.
 */
export function logAuthEvent({
  request,
  userId,
  eventType,
  email,
  metadata,
}: LogParams): void {
  const ip =
    (request?.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ||
    request?.ip ||
    null;
  const userAgent = (request?.headers["user-agent"] as string | undefined) || null;

  prisma.authEvent
    .create({
      data: {
        userId: userId ?? null,
        eventType,
        email: email ?? null,
        ip,
        userAgent,
        metadata: metadata
          ? (metadata as Record<string, unknown> as never)
          : undefined,
      },
    })
    .catch((err) => {
      request?.log.warn({ err, eventType }, "failed to write audit event");
    });
}
