import "server-only";
import { cookies } from "next/headers";
import { env, hasSupabase } from "./env";
import { hmac } from "./hash";

export const DEMO_COOKIE = "vent_admin";
export const demoToken = () => hmac(env.demoAdminPassword, "demo-admin");

export type Admin = { email: string; mode: "demo" };

/**
 * Demo mode only. With Supabase the admin panel runs in the browser and every action
 * is checked by the database (`admin_*` functions), so these server routes stay closed.
 */
export async function getAdmin(): Promise<Admin | null> {
  if (hasSupabase || !env.demoAdminPassword) return null;
  const store = await cookies();
  return store.get(DEMO_COOKIE)?.value === demoToken() ? { email: "demo@local", mode: "demo" } : null;
}
