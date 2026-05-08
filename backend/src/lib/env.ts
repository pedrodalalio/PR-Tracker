const isProd = process.env.NODE_ENV === "production";

function requireSecret(name: string): string {
  const value = process.env[name];
  if (value && value.length > 0) return value;
  if (isProd) {
    throw new Error(
      `[env] ${name} is required in production but is not set`,
    );
  }
  // eslint-disable-next-line no-console
  console.warn(
    `[env] ${name} not set — using insecure dev fallback. DO NOT deploy without setting it.`,
  );
  return `dev-${name.toLowerCase()}-do-not-use-in-prod`;
}

export const JWT_SECRET = requireSecret("JWT_SECRET");
export const COOKIE_SECRET = requireSecret("COOKIE_SECRET");

// Strava OAuth state token uses a dedicated secret to avoid key reuse with
// access-token signing. Falls back to JWT_SECRET if STRAVA_STATE_SECRET is
// unset (preserves compatibility with existing deploys until rotated).
export const STRAVA_STATE_SECRET =
  process.env.STRAVA_STATE_SECRET && process.env.STRAVA_STATE_SECRET.length > 0
    ? process.env.STRAVA_STATE_SECRET
    : JWT_SECRET;
