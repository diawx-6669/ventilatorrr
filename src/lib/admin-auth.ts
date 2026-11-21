import "server-only";
import { cookies } from "next/headers";
import { env, hasSupabase } from "./env";
import { hmac } from "./hash";
import { sessionClient } from "./supabase/clients";

export const DEMO_COOKIE = "vent_admin";
export const demoToken = () => hmac(env.demoAdminPassword, "demo-admin");

export type Admin = { email: string; mode: "supabase" | "demo" };

/** Who is the signed-in team member, if any. */
export async function getAdmin(): Promise<Admin | null> {
  if (hasSupabase) {
    const db = await sessionClient();
    const { data } = await db.auth.getUser();
    if (!data.user?.email) return null;
    const { data: ok } = await db.rpc("is_admin");
    return ok === true ? { email: data.user.email, mode: "supabase" } : null;
  }
  if (!env.demoAdminPassword) return null;
  const store = await cookies();
  return store.get(DEMO_COOKIE)?.value === demoToken() ? { email: "demo@local", mode: "demo" } : null;
}
