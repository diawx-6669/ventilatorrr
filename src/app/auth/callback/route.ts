import { NextResponse, type NextRequest } from "next/server";
import { sessionClient } from "@/lib/supabase/clients";

/** Landing point for the email sign-in link. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const target = new URL("/admin", req.url);
  if (code) {
    const { error } = await (await sessionClient()).auth.exchangeCodeForSession(code);
    if (error) target.searchParams.set("error", "link");
  }
  return NextResponse.redirect(target);
}
