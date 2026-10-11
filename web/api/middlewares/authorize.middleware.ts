import type { ApiHandler } from "./types";

export type Role = "user" | "admin";

/**
 * Restricts a route to one or more roles after authentication.
 */
export function withRoles(
  ...allowed: Role[]
): (handler: ApiHandler) => ApiHandler {
  return (handler) => async (request, context) => {
    const role = context.role;
    if (!role || !allowed.includes(role)) {
      return Response.json(
        { success: false, message: "Forbidden" },
        { status: 403 },
      );
    }
    return handler(request, context);
  };
}
