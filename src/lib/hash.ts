import "server-only";
import { createHmac } from "node:crypto";
import { env } from "./env";

/** One-way, salted. Used for rate limits and vote dedupe so no raw IP or device id is ever stored. */
export function hmac(value: string, purpose: string): string {
  return createHmac("sha256", env.hashSalt).update(`${purpose}:${value}`).digest("hex").slice(0, 40);
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
