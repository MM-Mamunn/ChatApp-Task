import { z } from "zod";
import type { ApiContext } from "../middlewares/types";
import { AppError } from "../errors/app-error";
import {
  listAllUsers,
  updateUserRole,
  updateUserStatus,
  listActivityLogs,
  listAdminConversations,
  getAdminDirectMessages,
} from "../services/admin.service";
import {
  apiSuccess,
  apiPaginatedSuccess,
  apiError,
  serverErrorResponse,
  unauthorizedResponse,
  badRequestResponse,
} from "../utils/response";
import { validateBody, validateQuery } from "../validation/validate";

const updateRoleSchema = z.object({
  role: z.enum(["user", "admin"], {
    message: "Role must be either 'user' or 'admin'",
  }),
});

const updateStatusSchema = z.object({
  is_active: z.boolean({
    message: "is_active must be a boolean",
  }),
});

const listActivityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().optional(),
  action: z.string().optional(),
});

const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z.string().optional(),
});

function handleControllerError(err: unknown): Response {
  if (err instanceof AppError) {
    return apiError(err.code, err.message, err.statusCode, err.details);
  }
  console.error("[AdminController Error]", err);
  return serverErrorResponse();
}

async function resolveParams(
  context: ApiContext,
): Promise<Record<string, string | string[] | undefined>> {
  if (!context.params) return {};
  if (context.params instanceof Promise) {
    return (await context.params) as Record<
      string,
      string | string[] | undefined
    >;
  }
  return context.params;
}

/**
 * GET /api/admin/users
 * Returns list of all registered users with complete metadata.
 */
export async function listUsersController(
  _request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const users = await listAllUsers();
    return apiSuccess(users);
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * PATCH /api/admin/users/:userEmail/role
 * Changes a user's role and logs the audit event.
 */
export async function updateUserRoleController(
  request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  const params = await resolveParams(context);
  const rawEmail = params.userEmail;
  if (!rawEmail || typeof rawEmail !== "string") {
    return badRequestResponse("Missing userEmail parameter");
  }
  const targetEmail = decodeURIComponent(rawEmail);

  const validation = await validateBody(request, updateRoleSchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const updated = await updateUserRole(
      context.userId,
      targetEmail,
      validation.data.role,
    );
    return apiSuccess(updated);
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * PATCH /api/admin/users/:userEmail/status
 * Changes a user's active status. Deactivating revokes all refresh tokens.
 */
export async function updateUserStatusController(
  request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  const params = await resolveParams(context);
  const rawEmail = params.userEmail;
  if (!rawEmail || typeof rawEmail !== "string") {
    return badRequestResponse("Missing userEmail parameter");
  }
  const targetEmail = decodeURIComponent(rawEmail);

  const validation = await validateBody(request, updateStatusSchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const updated = await updateUserStatus(
      context.userId,
      targetEmail,
      validation.data.is_active,
    );
    return apiSuccess(updated);
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * GET /api/admin/activity
 * Retrieves platform activity logs with cursor pagination.
 */
export async function listActivityLogsController(
  request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  const validation = validateQuery(request, listActivityQuerySchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const result = await listActivityLogs(validation.data);
    return apiPaginatedSuccess(result.data, result.pagination);
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * GET /api/admin/conversations
 * Aggregated overview of all direct and group conversations.
 */
export async function listAdminConversationsController(
  _request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const overview = await listAdminConversations();
    return apiSuccess(overview);
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * GET /api/admin/conversations/direct/:userA/:userB/messages
 * Read-only message inspection between any two users with audit logging.
 */
export async function getAdminDirectMessagesController(
  request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  const params = await resolveParams(context);
  const rawA = params.userA;
  const rawB = params.userB;
  if (!rawA || typeof rawA !== "string" || !rawB || typeof rawB !== "string") {
    return badRequestResponse("Missing userA or userB parameters");
  }

  const userA = decodeURIComponent(rawA);
  const userB = decodeURIComponent(rawB);

  const validation = validateQuery(request, listMessagesQuerySchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const result = await getAdminDirectMessages(
      context.userId,
      userA,
      userB,
      validation.data,
    );
    return apiPaginatedSuccess(result.data, result.pagination);
  } catch (err) {
    return handleControllerError(err);
  }
}
