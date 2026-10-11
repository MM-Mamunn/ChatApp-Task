import { z } from "zod";
import type { ApiContext } from "../middlewares/types";
import { AppError } from "../errors/app-error";
import {
  getOwnProfile,
  updateOwnProfile,
  searchUsers,
} from "../services/users.service";
import {
  apiSuccess,
  apiError,
  serverErrorResponse,
  unauthorizedResponse,
} from "../utils/response";
import { validateBody, validateQuery } from "../validation/validate";

const updateProfileSchema = z
  .object({
    name: z
      .string()
      .min(1, "Name cannot be empty")
      .max(128, "Name must not exceed 128 characters")
      .optional(),
    avatar_url: z
      .string()
      .url("avatar_url must be a valid URL")
      .nullable()
      .optional(),
  })
  .refine((data) => data.name !== undefined || data.avatar_url !== undefined, {
    message: "At least one field (name or avatar_url) must be provided",
  });

const searchQuerySchema = z.object({
  query: z.string().min(1, "Search query is required"),
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

function handleControllerError(err: unknown): Response {
  if (err instanceof AppError) {
    return apiError(err.code, err.message, err.statusCode, err.details);
  }
  console.error("[UsersController Error]", err);
  return serverErrorResponse();
}

/**
 * GET /api/users/me
 * Retrieves current authenticated user profile.
 */
export async function getOwnProfileController(
  _request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const profile = await getOwnProfile(context.userId);
    return apiSuccess(profile);
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * PATCH /api/users/me
 * Updates current authenticated user profile.
 */
export async function updateOwnProfileController(
  request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  const validation = await validateBody(request, updateProfileSchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const updated = await updateOwnProfile(context.userId, validation.data);
    return apiSuccess(updated);
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * GET /api/users?query=...&limit=...
 * Searches users by name or email. Returns limited fields for 'user' role.
 */
export async function searchUsersController(
  request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  const validation = validateQuery(request, searchQuerySchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const results = await searchUsers(
      validation.data.query,
      validation.data.limit,
      context.role || "user",
    );
    return apiSuccess(results);
  } catch (err) {
    return handleControllerError(err);
  }
}
