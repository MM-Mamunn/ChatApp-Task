import {
  getCorsHeaders,
  handleCorsPreflight,
  isOriginAllowed,
} from "./cors.middleware";
import type { ApiHandler } from "./types";
import { forbiddenResponse } from "../utils/response";

/**
 * Standard HTTP security headers matching OWASP and Next.js recommendations.
 */
export const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "off",
};

/**
 * Attaches standard security headers and CORS headers to any outgoing Response.
 */
export function applySecurityHeaders(
  response: Response,
  request?: Request,
): Response {
  const origin = request?.headers.get("origin") ?? null;
  const corsHeaders = getCorsHeaders(origin);

  const newHeaders = new Headers(response.headers);

  // Apply baseline security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    if (!newHeaders.has(key)) {
      newHeaders.set(key, value);
    }
  }

  // Apply HSTS in production environments
  if (
    process.env.NODE_ENV === "production" &&
    !newHeaders.has("Strict-Transport-Security")
  ) {
    newHeaders.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }

  // Apply CORS headers
  for (const [key, value] of Object.entries(corsHeaders)) {
    newHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

/**
 * Middleware wrapper that enforces CORS origin checking, preflight handling,
 * and attaches security headers to responses.
 */
export function withSecurity(handler: ApiHandler): ApiHandler {
  return async (request, context) => {
    // 1. Handle CORS preflight
    const preflight = handleCorsPreflight(request);
    if (preflight) return preflight;

    // 2. Reject disallowed origins on mutating or cross-origin requests
    const origin = request.headers.get("origin");
    if (origin && !isOriginAllowed(origin)) {
      return forbiddenResponse("CORS origin not allowed");
    }

    // 3. Execute handler and decorate with security headers
    const response = await handler(request, context);
    return applySecurityHeaders(response, request);
  };
}
