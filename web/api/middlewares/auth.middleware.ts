import { verifyAccessToken } from "../authentication/tokens";
import type { ApiHandler } from "./types";

/**
 * Validates Bearer access JWT and attaches userId/role to context.
 * Use on protected routes in later steps.
 */
export function withAuth(handler: ApiHandler): ApiHandler {
  return async (request, context) => {
    const header = request.headers.get("authorization");
    const token = header?.startsWith("Bearer ")
      ? header.slice("Bearer ".length)
      : null;

    if (!token) {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }

    try {
      const payload = await verifyAccessToken(token);
      return handler(request, {
        ...context,
        userId: payload.sub,
        role: payload.role,
      });
    } catch {
      return Response.json(
        { success: false, message: "Unauthorized" },
        { status: 401 },
      );
    }
  };
}
