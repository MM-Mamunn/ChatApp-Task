import crypto from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { JWT_ACCESS_TTL_SECONDS, getJwtAccessSecret } from "./jwt.config";

export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days in seconds

export type AccessTokenClaims = JWTPayload & {
  sub: string;
  role?: "user" | "admin";
};

function accessSecretKey() {
  return new TextEncoder().encode(getJwtAccessSecret());
}

/**
 * Creates a signed short-lived JWT access token (HS256).
 */
export async function createAccessToken(
  claims: Omit<AccessTokenClaims, "iat" | "exp">,
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${JWT_ACCESS_TTL_SECONDS}s`)
    .sign(accessSecretKey());
}

/**
 * Verifies a signed JWT access token and returns payload claims.
 */
export async function verifyAccessToken(
  token: string,
): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, accessSecretKey(), {
    algorithms: ["HS256"],
  });
  if (typeof payload.sub !== "string") {
    throw new Error("Invalid access token: missing subject");
  }
  return payload as AccessTokenClaims;
}

/**
 * Generates an opaque, high-entropy 64-character hex refresh token (32 random bytes).
 */
export function generateOpaqueRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Computes the SHA-256 hash of a token for secure database persistence and lookup.
 */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
