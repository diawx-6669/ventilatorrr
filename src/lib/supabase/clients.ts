import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "../env";

const noSession = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** Anonymous client. Everything it does is limited by Row Level Security. */
export function anonClient(): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, noSession);
}

/** Service-role client for rate limits and votes only. Never imported by client code. */
export function serviceClient(): SupabaseClient | null {
  if (!env.supabaseServiceKey) return null;
  return createClient(env.supabaseUrl, env.supabaseServiceKey, noSession);
}

/** Client acting as the signed-in team member. RLS checks `is_admin()`. */
export async function sessionClient(): Promise<SupabaseClient> {
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}
