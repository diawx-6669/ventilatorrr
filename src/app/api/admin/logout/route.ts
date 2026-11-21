import { NextResponse } from "next/server";
import { hasSupabase } from "@/lib/env";
import { DEMO_COOKIE } from "@/lib/admin-auth";
import { sessionClient } from "@/lib/supabase/clients";

export async function POST() {
  if (hasSupabase) await (await sessionClient()).auth.signOut();
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(DEMO_COOKIE);
  return res;
}
