import type { ApiErrorDetail } from "../utils/response";
import { API_ERROR_CODES, type ApiErrorCode } from "./codes";

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ApiErrorCode;
  readonly details?: ApiErrorDetail[];

  constructor(
    statusCode: number,
    code: ApiErrorCode,
    message: string,
    details?: ApiErrorDetail[],
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", details?: ApiErrorDetail[]) {
    super(400, API_ERROR_CODES.BAD_REQUEST, message, details);
    this.name = "BadRequestError";
  }
}

export class ValidationError extends AppError {
  constructor(
    details: ApiErrorDetail[],
    message = "The request contains invalid fields",
  ) {
    super(400, API_ERROR_CODES.VALIDATION_ERROR, message, details);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Missing or invalid authorization token") {
    super(401, API_ERROR_CODES.UNAUTHORIZED, message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to access this resource") {
    super(403, API_ERROR_CODES.FORBIDDEN, message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(message = "The requested resource was not found") {
    super(404, API_ERROR_CODES.NOT_FOUND, message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(
    message = "The request could not be completed due to a conflict with current state",
  ) {
    super(409, API_ERROR_CODES.CONFLICT, message);
    this.name = "ConflictError";
  }
}

export class RateLimitedError extends AppError {
  constructor(message = "Too many requests. Please try again later.") {
    super(429, API_ERROR_CODES.RATE_LIMITED, message);
    this.name = "RateLimitedError";
  }
}

export class InternalServerError extends AppError {
  constructor(message = "An unexpected internal server error occurred") {
    super(500, API_ERROR_CODES.INTERNAL_SERVER_ERROR, message);
    this.name = "InternalServerError";
  }
}
