import type { z } from "zod";
import type { ApiErrorDetail } from "../utils/response";

/**
 * Formats a ZodError into an array of ApiErrorDetail objects matching the API contract.
 * Produces: { field: "email", issue: "Invalid email address format" }
 */
export function formatZodIssues(error: z.ZodError): ApiErrorDetail[] {
  return error.issues.map((issue) => {
    const fieldPath = issue.path.join(".");
    return {
      ...(fieldPath ? { field: fieldPath } : {}),
      issue: issue.message,
    };
  });
}
