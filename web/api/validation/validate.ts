import type { z } from "zod";
import { safeParseJson } from "../utils/request";
import { validationErrorResponse } from "../utils/response";
import { formatZodIssues } from "./format";

export type ValidationResult<T> =
  { success: true; data: T } | { success: false; response: Response };

/**
 * Validates the JSON body of an incoming request against a Zod schema.
 * Returns either parsed typed data or a ready-to-return 400 Response.
 */
export async function validateBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<ValidationResult<T>> {
  const jsonResult = await safeParseJson(request);
  if (!jsonResult.success) {
    return { success: false, response: jsonResult.errorResponse };
  }

  const parseResult = schema.safeParse(jsonResult.data);
  if (!parseResult.success) {
    const details = formatZodIssues(parseResult.error);
    return {
      success: false,
      response: validationErrorResponse(details),
    };
  }

  return { success: true, data: parseResult.data };
}

/**
 * Validates the URL search parameters of an incoming request against a Zod schema.
 */
export function validateQuery<T>(
  request: Request,
  schema: z.ZodType<T>,
): ValidationResult<T> {
  const url = new URL(request.url);
  const queryObj: Record<string, string | string[]> = {};

  for (const [key, value] of url.searchParams.entries()) {
    if (key in queryObj) {
      const existing = queryObj[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        queryObj[key] = [existing, value];
      }
    } else {
      queryObj[key] = value;
    }
  }

  const parseResult = schema.safeParse(queryObj);
  if (!parseResult.success) {
    const details = formatZodIssues(parseResult.error);
    return {
      success: false,
      response: validationErrorResponse(details),
    };
  }

  return { success: true, data: parseResult.data };
}

/**
 * Validates route parameters (e.g., from Next.js route context) against a Zod schema.
 */
export function validateParams<T>(
  params: Record<string, unknown>,
  schema: z.ZodType<T>,
): ValidationResult<T> {
  const parseResult = schema.safeParse(params);
  if (!parseResult.success) {
    const details = formatZodIssues(parseResult.error);
    return {
      success: false,
      response: validationErrorResponse(details),
    };
  }

  return { success: true, data: parseResult.data };
}
