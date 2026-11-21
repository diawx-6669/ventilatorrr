import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env, hasSupabase } from "@/lib/env";
import { DEMO_COOKIE, demoToken } from "@/lib/admin-auth";
import { repo } from "@/lib/repo";
import { clientIp, hmac } from "@/lib/hash";

/** Demo mode only. With Supabase the team signs in by email link. */
export async function POST(req: NextRequest) {
  if (hasSupabase || !env.demoAdminPassword) return NextResponse.json({ ok: false }, { status: 404 });
  if (!(await repo.rateLimit(hmac(clientIp(req.headers), "login"), 10, 900))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const a = Buffer.from(String(password ?? ""));
  const b = Buffer.from(env.demoAdminPassword);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return NextResponse.json({ ok: false }, { status: 401 });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DEMO_COOKIE, demoToken(), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return res;
}
