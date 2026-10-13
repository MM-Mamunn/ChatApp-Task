/**
 * Browser-side Supabase client singleton for Realtime subscriptions.
 * Uses public environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * Architecture note:
 * - This client is exclusively used for listening to Supabase Realtime channel events.
 * - All message creation, mutations, and authentication remain strictly guarded by
 *   our Next.js API route handlers (/api) and server-side RBAC.
 */
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "./env/public";

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (supabaseInstance) {
    return supabaseInstance;
  }

  const url = publicEnv.supabaseUrl;
  const key = publicEnv.supabaseAnonKey;

  if (!url || !key) {
    return null;
  }

  supabaseInstance = createBrowserClient(url, key, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseInstance;
}

/**
 * Initiates Google OAuth 2.0 PKCE handshake via Supabase Auth.
 * The browser client stores the PKCE code_verifier in an HTTP cookie,
 * which is subsequently read by the server Route Handler during exchange.
 */
export async function signInWithGoogle(redirectTo?: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase client is not initialized");
  }

  const targetOrigin =
    typeof window !== "undefined" ? window.location.origin : "";
  const callbackUrl = redirectTo || `${targetOrigin}/api/auth/callback`;

  return supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });
}
