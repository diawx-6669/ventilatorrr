import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { repo } from "@/lib/repo";
import { clientIp, hmac } from "@/lib/hash";

const DEVICE_COOKIE = "vid";
const body = z.object({ ideaId: z.string().min(1).max(64) });

/**
 * One vote per idea per device. The device id is a random httpOnly cookie, stored only as a salted hash.
 * Not per IP on purpose: the whole school shares a few Wi-Fi addresses.
 */
export async function POST(req: NextRequest) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const allowed = await repo.rateLimit(hmac(clientIp(req.headers), "vote"), 120, 3600);
  if (!allowed) return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });

  const existing = req.cookies.get(DEVICE_COOKIE)?.value;
  const deviceId = existing && /^[0-9a-f-]{36}$/.test(existing) ? existing : randomUUID();

  try {
    const result = await repo.vote(parsed.data.ideaId, hmac(deviceId, "vote"));
    if (!result) return NextResponse.json({ ok: false }, { status: 404 });
    const res = NextResponse.json({ ok: true, ...result });
    if (!existing) {
      res.cookies.set(DEVICE_COOKIE, deviceId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 365,
        path: "/",
      });
    }
    return res;
  } catch (e) {
    console.error("vote", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
