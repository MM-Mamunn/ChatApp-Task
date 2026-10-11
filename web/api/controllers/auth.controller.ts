import { z } from "zod";
import {
  extractRefreshToken,
  serializeClearRefreshTokenCookie,
  serializeRefreshTokenCookie,
} from "../authentication/cookies";
import { AppError } from "../errors/app-error";
import {
  bootstrapAdmin,
  loginUser,
  logoutUser,
  refreshSession,
  registerUser,
} from "../services/auth.service";
import { apiError, apiSuccess, serverErrorResponse } from "../utils/response";
import { validateBody } from "../validation/validate";

const registerSchema = z.object({
  email: z.string().email("Invalid email address format"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  name: z
    .string()
    .min(1, "Name cannot be empty")
    .max(128, "Name must not exceed 128 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address format"),
  password: z.string().min(1, "Password is required"),
});

const bootstrapAdminSchema = z.object({
  email: z.string().email("Invalid email address format"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  name: z
    .string()
    .min(1, "Name cannot be empty")
    .max(128, "Name must not exceed 128 characters"),
});

function handleControllerError(err: unknown): Response {
  if (err instanceof AppError) {
    return apiError(err.code, err.message, err.statusCode, err.details);
  }
  console.error("[AuthController Error]", err);
  return serverErrorResponse();
}

/**
 * POST /api/auth/register
 */
export async function registerController(request: Request): Promise<Response> {
  const validation = await validateBody(request, registerSchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const result = await registerUser(validation.data);
    const cookie = serializeRefreshTokenCookie(result.raw_refresh_token);

    return apiSuccess(
      {
        user: result.user,
        access_token: result.access_token,
      },
      {
        status: 201,
        headers: {
          "Set-Cookie": cookie,
        },
      },
    );
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * POST /api/auth/login
 */
export async function loginController(request: Request): Promise<Response> {
  const validation = await validateBody(request, loginSchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const result = await loginUser(validation.data);
    const cookie = serializeRefreshTokenCookie(result.raw_refresh_token);

    return apiSuccess(
      {
        user: result.user,
        access_token: result.access_token,
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": cookie,
        },
      },
    );
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * POST /api/auth/refresh
 */
export async function refreshController(request: Request): Promise<Response> {
  const rawToken =
    extractRefreshToken(request) ||
    request.headers.get("x-refresh-token") ||
    null;

  try {
    const result = await refreshSession(rawToken);
    const cookie = serializeRefreshTokenCookie(result.raw_refresh_token);

    return apiSuccess(
      {
        access_token: result.access_token,
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": cookie,
        },
      },
    );
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * POST /api/auth/logout
 */
export async function logoutController(request: Request): Promise<Response> {
  const rawToken =
    extractRefreshToken(request) ||
    request.headers.get("x-refresh-token") ||
    null;

  try {
    await logoutUser(rawToken);
    const clearCookie = serializeClearRefreshTokenCookie();

    return Response.json(
      {
        success: true,
        message: "Logged out successfully",
      },
      {
        status: 200,
        headers: {
          "Set-Cookie": clearCookie,
        },
      },
    );
  } catch (err) {
    return handleControllerError(err);
  }
}

/**
 * POST /api/auth/bootstrap-admin
 */
export async function bootstrapAdminController(
  request: Request,
): Promise<Response> {
  const secretHeader =
    request.headers.get("x-bootstrap-secret") ||
    request.headers.get("X-Bootstrap-Secret") ||
    null;

  const validation = await validateBody(request, bootstrapAdminSchema);
  if (!validation.success) {
    return validation.response;
  }

  try {
    const result = await bootstrapAdmin(validation.data, secretHeader);
    return apiSuccess(
      {
        user: result.user,
      },
      {
        status: 201,
      },
    );
  } catch (err) {
    return handleControllerError(err);
  }
}
