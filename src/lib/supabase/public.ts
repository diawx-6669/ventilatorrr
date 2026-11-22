import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../deploy";

let client: SupabaseClient | null = null;

/**
 * Anonymous Supabase client that works in the browser and on the server.
 * Everything it can do is limited by Row Level Security and the RPCs in supabase/migrations.
 * No Supabase Auth session: the team signs in through our own `admin_*` functions.
 */
export function publicDb(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return client;
}
