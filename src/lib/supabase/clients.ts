import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../env";

const noSession = { auth: { persistSession: false, autoRefreshToken: false } } as const;

/** Anonymous client. Everything it does is limited by Row Level Security. */
export function anonClient(): SupabaseClient {
  return createClient(env.supabaseUrl, env.supabaseAnonKey, noSession);
}

/** Service-role client for inserts, rate limits and votes. Never imported by client code. */
export function serviceClient(): SupabaseClient | null {
  if (!env.supabaseServiceKey) return null;
  return createClient(env.supabaseUrl, env.supabaseServiceKey, noSession);
}
