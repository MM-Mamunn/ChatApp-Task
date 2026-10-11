import { getPublicAppUrl } from "../configuration/env";
import { forbiddenResponse } from "../utils/response";

/**
 * Returns the list of permitted origins for cross-origin requests.
 */
export function getAllowedOrigins(): string[] {
  const configuredAppUrl = getPublicAppUrl();
  const origins = new Set<string>();

  try {
    const parsed = new URL(configuredAppUrl);
    origins.add(parsed.origin);
  } catch {
    origins.add(configuredAppUrl);
  }

  // In non-production environments, also permit localhost variations
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return Array.from(origins);
}

/**
 * Checks if a given origin header is in the allowlist.
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Same-origin or non-browser client
  const allowed = getAllowedOrigins();
  return allowed.includes(origin);
}

/**
 * Generates CORS headers for a request.
 * If origin is disallowed, returns empty headers so browser CORS blocking takes effect.
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return {};

  if (!isOriginAllowed(origin)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, Accept",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

/**
 * Handles CORS preflight OPTIONS requests.
 * Returns a 204 Response with CORS headers for allowed origins,
 * a 403 Response for disallowed origins, or null for non-OPTIONS requests.
 */
export function handleCorsPreflight(request: Request): Response | null {
  if (request.method !== "OPTIONS") return null;

  const origin = request.headers.get("origin");
  if (origin && !isOriginAllowed(origin)) {
    return forbiddenResponse("CORS origin not allowed");
  }

  const corsHeaders = getCorsHeaders(origin);
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
