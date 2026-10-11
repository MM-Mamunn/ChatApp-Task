import { verifyAccessToken } from "../authentication/tokens";
import { unauthorizedResponse } from "../utils/response";
import type { ApiHandler } from "./types";

/**
 * Validates Bearer access JWT and attaches userId and role to request context.
 * Returns standardized 401 UNAUTHORIZED error envelope on failure.
 */
export function withAuth(handler: ApiHandler): ApiHandler {
  return async (request, context) => {
    const header = request.headers.get("authorization");
    const token = header?.startsWith("Bearer ")
      ? header.slice("Bearer ".length).trim()
      : null;

    if (!token) {
      return unauthorizedResponse("Missing or invalid authorization header");
    }

    try {
      const payload = await verifyAccessToken(token);
      return handler(request, {
        ...context,
        userId: payload.sub,
        role: payload.role,
      });
    } catch {
      return unauthorizedResponse("Access token is invalid or expired");
    }
  };
}
