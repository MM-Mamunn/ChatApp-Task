export const REFRESH_COOKIE_NAME = "refresh_token";
export const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Serializes the HTTP-only refresh_token cookie for secure transmission.
 */
export function serializeRefreshTokenCookie(token: string): string {
  const isProd = process.env.NODE_ENV === "production";
  const secureFlag = isProd ? "; Secure" : "";
  return `${REFRESH_COOKIE_NAME}=${token}; HttpOnly${secureFlag}; SameSite=Lax; Path=/api/auth; Max-Age=${REFRESH_COOKIE_MAX_AGE}`;
}

/**
 * Serializes an expired cookie to clear the refresh_token from client storage.
 */
export function serializeClearRefreshTokenCookie(): string {
  const isProd = process.env.NODE_ENV === "production";
  const secureFlag = isProd ? "; Secure" : "";
  return `${REFRESH_COOKIE_NAME}=; HttpOnly${secureFlag}; SameSite=Lax; Path=/api/auth; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

/**
 * Extracts the refresh_token value from incoming Request Cookie headers.
 */
export function extractRefreshToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [name, ...rest] = cookie.trim().split("=");
    if (name === REFRESH_COOKIE_NAME) {
      return rest.join("=").trim() || null;
    }
  }

  return null;
}
