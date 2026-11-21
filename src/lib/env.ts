import "server-only";

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  telegramToken: process.env.TELEGRAM_BOT_TOKEN ?? "",
  telegramChatId: process.env.TELEGRAM_CHAT_ID ?? "",
  hashSalt: process.env.HASH_SALT ?? "dev-only-salt-change-me",
  demoAdminPassword:
    process.env.DEMO_ADMIN_PASSWORD ?? (process.env.NODE_ENV === "production" ? "" : "efir"),
};

/** Supabase is "on" once the public URL and anon key are set. Otherwise the site runs on demo data. */
export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseAnonKey);

if (hasSupabase && process.env.NODE_ENV === "production") {
  if (!process.env.HASH_SALT) console.warn("[env] HASH_SALT is not set: IP and device hashes use a public default.");
  if (!env.supabaseServiceKey) console.warn("[env] SUPABASE_SERVICE_ROLE_KEY is not set: voting is off and rate limits are per-instance only.");
}
