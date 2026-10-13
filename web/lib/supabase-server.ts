import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "./env/public";

/**
 * Creates a server-side Supabase client equipped with Next.js 16 cookie store methods.
 * Used exclusively in Route Handlers (such as /api/auth/callback) to exchange
 * PKCE authorization codes for verified Supabase sessions.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  const url = publicEnv.supabaseUrl;
  const key = publicEnv.supabaseAnonKey;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Can be safely ignored if called from an environment where cookies are read-only
        }
      },
    },
  });
}
