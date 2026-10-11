import { badRequestResponse } from "./response";

export type SafeJsonResult<T> =
  { success: true; data: T } | { success: false; errorResponse: Response };

/**
 * Safely parses the JSON body of a Request.
 * If parsing fails (malformed syntax, empty body when unexpected), returns a standard 400 Response.
 */
export async function safeParseJson<T = unknown>(
  request: Request,
): Promise<SafeJsonResult<T>> {
  try {
    const text = await request.text();
    if (!text || !text.trim()) {
      return {
        success: false,
        errorResponse: badRequestResponse("Request body cannot be empty"),
      };
    }
    const data = JSON.parse(text) as T;
    return { success: true, data };
  } catch {
    return {
      success: false,
      errorResponse: badRequestResponse("Invalid JSON payload in request body"),
    };
  }
}

/**
 * Extracts the client IP from request headers (x-forwarded-for, cf-connecting-ip, etc.)
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp?.trim()) return cfIp.trim();

  return "127.0.0.1";
}

/**
 * Extracts or generates a unique request tracking ID.
 */
export function getRequestId(request: Request): string {
  const existing =
    request.headers.get("x-request-id") ||
    request.headers.get("traceparent") ||
    request.headers.get("x-amzn-trace-id");
  if (existing?.trim()) return existing.trim();

  return crypto.randomUUID();
}
