import { API_ERROR_CODES, type ApiErrorCode } from "../errors/codes";

export interface ApiErrorDetail {
  field?: string;
  issue: string;
}

export interface ApiErrorEnvelope {
  code: ApiErrorCode;
  message: string;
  details?: ApiErrorDetail[];
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorEnvelope;
}

export interface PaginationMeta {
  limit: number;
  has_more: boolean;
  next_cursor?: string | null;
  prev_cursor?: string | null;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  pagination?: PaginationMeta;
}

/**
 * Creates a standardized API success Response.
 */
export function apiSuccess<T>(data: T, init?: ResponseInit): Response {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
  };
  return Response.json(body, init);
}

/**
 * Creates a standardized paginated API success Response.
 */
export function apiPaginatedSuccess<T>(
  data: T,
  pagination: PaginationMeta,
  init?: ResponseInit,
): Response {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    pagination,
  };
  return Response.json(body, init);
}

/**
 * Creates a standardized API error Response.
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: ApiErrorDetail[],
  headers?: HeadersInit,
): Response {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && details.length > 0 ? { details } : {}),
    },
  };
  return Response.json(body, { status, headers });
}

export function badRequestResponse(
  message = "Bad request",
  details?: ApiErrorDetail[],
): Response {
  return apiError(API_ERROR_CODES.BAD_REQUEST, message, 400, details);
}

export function validationErrorResponse(
  details: ApiErrorDetail[],
  message = "The request contains invalid fields",
): Response {
  return apiError(API_ERROR_CODES.VALIDATION_ERROR, message, 400, details);
}

export function unauthorizedResponse(
  message = "Missing or invalid authorization token",
): Response {
  return apiError(API_ERROR_CODES.UNAUTHORIZED, message, 401);
}

export function forbiddenResponse(
  message = "You do not have permission to access this resource",
): Response {
  return apiError(API_ERROR_CODES.FORBIDDEN, message, 403);
}

export function notFoundResponse(
  message = "The requested resource was not found",
): Response {
  return apiError(API_ERROR_CODES.NOT_FOUND, message, 404);
}

export function conflictResponse(
  message = "The request could not be completed due to a conflict with current state",
): Response {
  return apiError(API_ERROR_CODES.CONFLICT, message, 409);
}

export function serverErrorResponse(
  message = "An unexpected internal server error occurred",
): Response {
  return apiError(API_ERROR_CODES.INTERNAL_SERVER_ERROR, message, 500);
}
