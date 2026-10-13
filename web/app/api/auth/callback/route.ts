import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { resolveOAuthUser } from "@/api/services/auth.service";
import { serializeRefreshTokenCookie } from "@/api/authentication/cookies";

/**
 * OAuth 2.0 PKCE Callback Route Handler for Supabase Auth.
 *
 * Sequence:
 * 1. Reads 'code' authorization parameter (or 'error' parameter if user cancelled).
 * 2. Exchanges PKCE authorization code for verified Supabase session using server client cookies.
 * 3. Resolves user in application database:
 *    - Links existing email/password accounts without altering bcrypt password hash or role.
 *    - Rejects deactivated accounts immediately with 403.
 *    - Creates new user profile for first-time sign-ups.
 * 4. Serializes application's native HTTP-only refresh token cookie.
 * 5. Redirects the browser to /chat (or requested 'next' path) with session cookie attached.
 */
/**
 * Resolves the true external public origin.
 * In serverless environments behind edge proxies (such as Vercel),
 * request.url internally reflects the container listener (e.g. localhost:10000).
 * We inspect proxy headers (x-forwarded-host, x-forwarded-proto) or public configuration
 * to ensure redirects target the real public domain.
 */
function getPublicOrigin(request: NextRequest): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") || "https";

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const host = request.headers.get("host");
  if (host && !host.includes("localhost:10000")) {
    const proto = request.headers.get("x-forwarded-proto") || "http";
    return `${proto}://${host}`;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  return request.nextUrl.origin;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") || "/chat";

  const origin = getPublicOrigin(request);

  // 1. Handle provider errors or user cancellation
  if (error) {
    const message = errorDescription || error;
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  try {
    // 2. Exchange authorization code for Supabase session using server PKCE client
    const supabase = await createServerSupabaseClient();
    const { data, error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    const user = data?.user;
    if (exchangeError || !user || !user.email) {
      const msg = exchangeError?.message || "oauth_exchange_failed";
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(msg)}`, origin),
      );
    }

    const userEmail = user.email;

    // 3. Resolve user in application database (atomic account link or new user provisioning)
    const sessionResult = await resolveOAuthUser({
      email: userEmail,
      name:
        (user.user_metadata?.full_name as string) ||
        (user.user_metadata?.name as string) ||
        userEmail.split("@")[0],
      avatarUrl:
        (user.user_metadata?.avatar_url as string) ||
        (user.user_metadata?.picture as string) ||
        null,
      emailConfirmedAt: user.email_confirmed_at || null,
    });

    // 4. Serialize application's HTTP-only refresh token cookie
    const cookieHeader = serializeRefreshTokenCookie(
      sessionResult.raw_refresh_token,
    );

    // 5. Construct redirect to destination (default /chat) with session cookie attached
    const destinationPath = next.startsWith("/") ? next : "/chat";
    const redirectUrl = new URL(destinationPath, origin);
    const response = NextResponse.redirect(redirectUrl);
    response.headers.append("Set-Cookie", cookieHeader);

    return response;
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessage)}`, origin),
    );
  }
}
