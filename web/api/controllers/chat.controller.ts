import { z } from "zod";
import { AppError } from "../errors/app-error";
import type { ApiContext } from "../middlewares/types";
import {
  createGroup,
  getDirectMessages,
  getGroupMessages,
  listDirectConversations,
  listUserGroups,
  sendDirectMessage,
  sendGroupMessage,
  startDirectConversation,
} from "../services/chat.service";
import {
  apiError,
  apiPaginatedSuccess,
  apiSuccess,
  serverErrorResponse,
  unauthorizedResponse,
} from "../utils/response";
import { validateBody, validateQuery } from "../validation/validate";

const startDirectConversationSchema = z.object({
  recipient_email: z.string().email("Invalid recipient email address"),
});

const sendDirectMessageSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(4000, "Message must not exceed 4000 characters")
    .refine((val) => val.trim().length > 0, {
      message: "Message cannot be empty or whitespace only",
    }),
});

const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z.string().optional(),
});

const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, "Group name cannot be empty")
    .max(128, "Group name must not exceed 128 characters")
    .refine((val) => val.trim().length > 0, {
      message: "Group name cannot be whitespace only",
    }),
  participant_emails: z
    .array(z.string().email("Invalid participant email address"))
    .min(1, "At least one participant email is required"),
});

const sendGroupMessageSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty")
    .max(4000, "Message must not exceed 4000 characters")
    .refine((val) => val.trim().length > 0, {
      message: "Message cannot be empty or whitespace only",
    }),
});

function handleControllerError(err: unknown): Response {
  if (err instanceof AppError) {
    return apiError(err.code, err.message, err.statusCode, err.details);
  }
  console.error("[ChatController Error]", err);
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
  return context.params as Record<string, string | string[] | undefined>;
}

/**
 * GET /api/conversations/direct
 * Lists all direct conversations for caller with last_message and other_user profile.
 */
export async function listDirectConversationsController(
  _request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const list = await listDirectConversations(context.userId);
    return apiSuccess(list);
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * POST /api/conversations/direct
 * Initiates or retrieves an existing direct conversation with a recipient.
 */
export async function startDirectConversationController(
  request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  const validation = await validateBody(request, startDirectConversationSchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const result = await startDirectConversation(
      context.userId,
      validation.data.recipient_email,
    );
    const status = result.is_new ? 201 : 200;
    return apiSuccess(result, { status });
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * GET /api/conversations/direct/[userEmail]/messages
 * Retrieves paginated message history with a recipient.
 */
export async function getDirectMessagesController(
  request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  const resolved = await resolveParams(context);
  const otherEmail = decodeURIComponent(
    typeof resolved.userEmail === "string" ? resolved.userEmail : "",
  );
  if (!otherEmail || !otherEmail.includes("@")) {
    return apiError("VALIDATION_ERROR", "Invalid userEmail parameter", 400, [
      { field: "userEmail", issue: "Must be a valid email address" },
    ]);
  }

  const validation = validateQuery(request, paginationQuerySchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const result = await getDirectMessages(
      context.userId,
      otherEmail,
      context.role || "user",
      validation.data,
    );
    return apiPaginatedSuccess(result.data, result.pagination);
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * POST /api/conversations/direct/[userEmail]/messages
 * Sends a direct message to a recipient.
 */
export async function sendDirectMessageController(
  request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  const resolved = await resolveParams(context);
  const recipientEmail = decodeURIComponent(
    typeof resolved.userEmail === "string" ? resolved.userEmail : "",
  );
  if (!recipientEmail || !recipientEmail.includes("@")) {
    return apiError("VALIDATION_ERROR", "Invalid userEmail parameter", 400, [
      { field: "userEmail", issue: "Must be a valid email address" },
    ]);
  }

  const validation = await validateBody(request, sendDirectMessageSchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const message = await sendDirectMessage(
      context.userId,
      recipientEmail,
      validation.data.message,
    );
    return apiSuccess(message, { status: 201 });
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * GET /api/groups
 * Lists all groups caller belongs to.
 */
export async function listGroupsController(
  _request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  try {
    const groupsList = await listUserGroups(context.userId);
    return apiSuccess(groupsList);
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * POST /api/groups
 * Creates a new named group conversation with participants.
 */
export async function createGroupController(
  request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  const validation = await validateBody(request, createGroupSchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const newGroup = await createGroup(
      context.userId,
      validation.data.name,
      validation.data.participant_emails,
    );
    return apiSuccess(newGroup, { status: 201 });
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * GET /api/groups/[groupId]/messages
 * Retrieves paginated group message history.
 */
export async function getGroupMessagesController(
  request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  const resolved = await resolveParams(context);
  const groupId =
    typeof resolved.groupId === "string" ? resolved.groupId.trim() : "";
  if (!groupId) {
    return apiError("VALIDATION_ERROR", "groupId is required", 400);
  }

  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(groupId)) {
    return apiError("VALIDATION_ERROR", "Invalid groupId format", 400, [
      { field: "groupId", issue: "Must be a valid UUID" },
    ]);
  }

  const validation = validateQuery(request, paginationQuerySchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const result = await getGroupMessages(
      context.userId,
      context.role || "user",
      groupId,
      validation.data,
    );
    return apiPaginatedSuccess(result.data, result.pagination);
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * POST /api/groups/[groupId]/messages
 * Sends a message to a group. Caller must be a member.
 */
export async function sendGroupMessageController(
  request: Request,
  context: ApiContext,
): Promise<Response> {
  if (!context.userId) {
    return unauthorizedResponse();
  }

  const resolved = await resolveParams(context);
  const groupId =
    typeof resolved.groupId === "string" ? resolved.groupId.trim() : "";
  if (!groupId) {
    return apiError("VALIDATION_ERROR", "groupId is required", 400);
  }

  const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(groupId)) {
    return apiError("VALIDATION_ERROR", "Invalid groupId format", 400, [
      { field: "groupId", issue: "Must be a valid UUID" },
    ]);
  }

  const validation = await validateBody(request, sendGroupMessageSchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const newMessage = await sendGroupMessage(
      context.userId,
      groupId,
      validation.data.message,
    );
    return apiSuccess(newMessage, { status: 201 });
  } catch (err) {
    return handleControllerError(err);
  }
}
