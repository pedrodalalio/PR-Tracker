import { FastifyReply } from "fastify";

export const REFRESH_COOKIE = "pr_refresh_token";

const REFRESH_TOKEN_TTL_SEC = 60 * 60 * 24 * 30;

const isProd = process.env.NODE_ENV === "production";

export function setRefreshCookie(reply: FastifyReply, refreshToken: string) {
  reply.setCookie(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SEC,
  });
}

export function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE, { path: "/" });
}
