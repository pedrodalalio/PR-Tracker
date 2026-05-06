import { FastifyReply } from "fastify";

export const ACCESS_COOKIE = "pr_access_token";
export const REFRESH_COOKIE = "pr_refresh_token";

const ACCESS_TOKEN_TTL_SEC = 60 * 60 * 24 * 7;
const REFRESH_TOKEN_TTL_SEC = 60 * 60 * 24 * 30;

const isProd = process.env.NODE_ENV === "production";

function baseCookieOptions() {
  return {
    httpOnly: true as const,
    secure: isProd,
    sameSite: (isProd ? "none" : "lax") as "none" | "lax",
    path: "/",
  };
}

export function setAuthCookies(
  reply: FastifyReply,
  accessToken: string,
  refreshToken: string,
) {
  reply.setCookie(ACCESS_COOKIE, accessToken, {
    ...baseCookieOptions(),
    maxAge: ACCESS_TOKEN_TTL_SEC,
  });
  reply.setCookie(REFRESH_COOKIE, refreshToken, {
    ...baseCookieOptions(),
    maxAge: REFRESH_TOKEN_TTL_SEC,
  });
}

export function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie(ACCESS_COOKIE, { path: "/" });
  reply.clearCookie(REFRESH_COOKIE, { path: "/" });
}
