import { forbiddenResponse } from "../utils/response";
import type { ApiHandler } from "./types";

export type Role = "user" | "admin";

/**
 * Restricts an authenticated route to one or more allowed roles.
 * Returns standardized 403 FORBIDDEN error envelope on failure.
 */
export function withRoles(
  ...allowed: Role[]
): (handler: ApiHandler) => ApiHandler {
  return (handler) => async (request, context) => {
    const role = context.role;
    if (!role || !allowed.includes(role)) {
      return forbiddenResponse(
        "You do not have permission to access this resource",
      );
    }
    return handler(request, context);
  };
}
