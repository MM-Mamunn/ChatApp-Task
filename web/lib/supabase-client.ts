/**
 * Browser-side Supabase client singleton for Realtime subscriptions.
 * Uses public environment variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 *
 * Architecture note:
 * - This client is exclusively used for listening to Supabase Realtime channel events.
 * - All message creation, mutations, and authentication remain strictly guarded by
 *   our Next.js API route handlers (/api) and server-side RBAC.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

  supabaseInstance = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseInstance;
}
