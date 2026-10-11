import { SignJWT, jwtVerify, type JWTPayload } from "jose";

import { JWT_ACCESS_TTL_SECONDS, getJwtAccessSecret } from "./jwt.config";

export type AccessTokenClaims = JWTPayload & {
  sub: string;
  role?: "user" | "admin";
};

function accessSecretKey() {
  return new TextEncoder().encode(getJwtAccessSecret());
}

export async function createAccessToken(
  claims: Omit<AccessTokenClaims, "iat" | "exp">,
): Promise<string> {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${JWT_ACCESS_TTL_SECONDS}s`)
    .sign(accessSecretKey());
}

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
