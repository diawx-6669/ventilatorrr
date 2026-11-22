import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin-auth";
import { env, hasSupabase } from "@/lib/env";

/** Demo mode: who is signed in, and whether the password login is available at all. */
export async function GET() {
  const admin = await getAdmin();
  return NextResponse.json(
    { ok: true, admin, available: !hasSupabase && Boolean(env.demoAdminPassword) },
    { headers: { "cache-control": "no-store" } },
  );
}
