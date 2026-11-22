/**
 * Where the site runs.
 * - Server (Vercel, `next start`): forms and votes go through our API routes.
 * - Static (GitHub Pages): no server. With the public Supabase keys set at build time,
 *   the browser talks to Supabase directly (forms, votes, live data, admin).
 *   Without them the static build is a read-only showcase.
 * Set at build time by next.config.ts and the environment.
 */
export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "1";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
/** The public Supabase keys are present: the browser can read and write through RLS and RPCs. */
export const HAS_DB = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/** Static page that writes straight to Supabase from the browser. */
export const DIRECT = IS_STATIC && HAS_DB;
/** Forms and votes work in this build. */
export const CAN_SUBMIT = !IS_STATIC || HAS_DB;

/** For raw <a href> and asset URLs; <Link> adds basePath on its own. */
export const withBase = (path: string) => `${BASE_PATH}${path}`;
