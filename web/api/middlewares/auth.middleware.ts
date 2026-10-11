import { eq } from "drizzle-orm";
import { verifyAccessToken } from "../authentication/tokens";
import { getDb } from "../database/client";
import { users } from "../database/schema/users";
import { forbiddenResponse, unauthorizedResponse } from "../utils/response";
import type { ApiHandler } from "./types";

/**
 * Validates Bearer access JWT, checks account active status in database,
 * and attaches userId and role to request context.
 * Returns standardized 401 UNAUTHORIZED or 403 FORBIDDEN on failure.
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

      // Deactivation check: verify is_active in database if DATABASE_URL is available
      if (process.env.DATABASE_URL) {
        try {
          const db = getDb();
          const userRecords = await db
            .select({ isActive: users.isActive, role: users.role })
            .from(users)
            .where(eq(users.email, payload.sub))
            .limit(1);

          if (userRecords.length > 0 && !userRecords[0].isActive) {
            return forbiddenResponse(
              "Account has been deactivated. Contact an administrator.",
            );
          }
        } catch {
          // Fall through to token claims if DB check cannot be completed
        }
      }

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
