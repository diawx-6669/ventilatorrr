import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";
import { repo } from "@/lib/repo";
import { clientIp, hmac } from "@/lib/hash";
import { notifyTeam } from "@/lib/telegram";
import { readPhoto } from "@/lib/photo";
import { MIN_FILL_MS, SUBMIT_SCHEMAS, toRow } from "@/lib/submission";
import { KINDS, type Kind } from "@/lib/types";
import { site } from "@/config/site";

const MAX_PER_HOUR = 5;

const ok = () => NextResponse.json({ ok: true });
const bad = (status: number, error: string, fields?: Record<string, string>) =>
  NextResponse.json({ ok: false, error, fields }, { status });

function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_");
    out[key] ??= issue.message;
  }
  return out;
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  if (!(KINDS as readonly string[]).includes(kind)) return bad(404, "unknown_kind");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return bad(400, "bad_request");
  }

  // Bots fill every field and submit instantly. Pretend it worked, store nothing.
  const honeypot = String(form.get("website") ?? "");
  const elapsed = Number(form.get("elapsed") ?? 0);
  if (honeypot || !Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) return ok();

  let payload: unknown;
  try {
    payload = JSON.parse(String(form.get("payload") ?? "{}"));
  } catch {
    return bad(400, "bad_request");
  }

  const schema = SUBMIT_SCHEMAS[kind as Kind];
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return bad(422, "invalid", fieldErrors(parsed.error));

  let photo: { bytes: Uint8Array; type: string } | null = null;
  const file = form.get("photo");
  if (kind === "news" && file instanceof File && file.size > 0) {
    const result = await readPhoto(file);
    if (result === "type") return bad(422, "invalid", { photo: "photoType" });
    if (result === "size") return bad(422, "invalid", { photo: "photoSize" });
    photo = result;
  }

  // Counted after validation so a typo doesn't eat a student's quota. Only a salted hash of the IP is used.
  const allowed = await repo.rateLimit(hmac(clientIp(req.headers), "submit"), MAX_PER_HOUR, 3600);
  if (!allowed) return bad(429, "rate_limited");

  try {
    const sub = toRow(kind as Kind, payload);
    if (sub.kind === "participate") {
      const r = sub.row;
      await repo.createParticipate(r);
      after(() =>
        notifyTeam([`🎤 ${site.name}: хочет в выпуск`, `${r.name}, ${r.grade} · ${r.role}`, r.pitch, `${r.contact_type === "telegram" ? "TG" : "IG"}: @${r.contact}`]),
      );
    } else if (sub.kind === "ideas") {
      const r = sub.row;
      await repo.createIdea(r);
      after(() => notifyTeam([`💡 ${site.name}: новая идея (${r.category})`, r.idea, r.name && `от: ${r.name}`]));
    } else {
      const r = sub.row;
      await repo.createNews(r, photo);
      after(() =>
        notifyTeam([
          `📰 ${site.name}: новость школы${r.is_anonymous ? " (анонимно)" : ""}`,
          r.what,
          r.source && `Источник: ${r.source}`,
          photo && "📎 есть фото",
          r.name && `от: ${r.name}`,
        ]),
      );
    }
  } catch (e) {
    console.error("submit", kind, e);
    return bad(500, "server");
  }

  return ok();
}
