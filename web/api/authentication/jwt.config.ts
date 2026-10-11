import { requireEnv } from "../configuration/env";

export function getJwtAccessSecret(): string {
  return requireEnv("JWT_ACCESS_SECRET");
}

export function getJwtRefreshSecret(): string {
  return requireEnv("JWT_REFRESH_SECRET");
}

/** Default access token lifetime (seconds) — refine in auth implementation. */
export const JWT_ACCESS_TTL_SECONDS = 15 * 60;
