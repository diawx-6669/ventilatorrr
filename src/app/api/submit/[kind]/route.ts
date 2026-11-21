import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";
import { repo } from "@/lib/repo";
import { clientIp, hmac } from "@/lib/hash";
import { notifyTeam } from "@/lib/telegram";
import { readPhoto } from "@/lib/photo";
import { ideaSchema, newsSchema, participateSchema, resolveNewsDate } from "@/lib/schemas";
import { KINDS, type Kind } from "@/lib/types";
import { site } from "@/config/site";

const MAX_PER_HOUR = 5;
/** Humans need more than this to fill any of the forms. */
const MIN_FILL_MS = 2500;

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

export async function POST(req: NextRequest, ctx: RouteContext<"/api/submit/[kind]">) {
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

  const schema = { participate: participateSchema, ideas: ideaSchema, news: newsSchema }[kind as Kind];
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
    if (kind === "participate") {
      const v = participateSchema.parse(payload);
      await repo.createParticipate({
        name: v.name,
        grade: `${v.grade}${v.letter}`,
        role: v.role,
        pitch: v.pitch,
        contact_type: v.contact_type,
        contact: v.contact,
        consent: v.consent,
      });
      after(() =>
        notifyTeam([
          `🎤 ${site.name}: хочет в выпуск`,
          `${v.name}, ${v.grade}${v.letter} · ${v.role}`,
          v.pitch,
          `${v.contact_type === "telegram" ? "TG" : "IG"}: @${v.contact}`,
        ]),
      );
    } else if (kind === "ideas") {
      const v = ideaSchema.parse(payload);
      await repo.createIdea({ idea: v.idea, category: v.category, name: v.name });
      after(() => notifyTeam([`💡 ${site.name}: новая идея (${v.category})`, v.idea, v.name && `от: ${v.name}`]));
    } else {
      const v = newsSchema.parse(payload);
      const anonymous = !v.signed;
      await repo.createNews(
        {
          what: v.what,
          happened_on: resolveNewsDate(v.when, v.date),
          when_preset: v.when,
          source: v.source,
          is_anonymous: anonymous,
          name: anonymous ? null : v.name,
        },
        photo,
      );
      after(() =>
        notifyTeam([
          `📰 ${site.name}: новость школы${anonymous ? " (анонимно)" : ""}`,
          v.what,
          v.source && `Источник: ${v.source}`,
          photo && "📎 есть фото",
          !anonymous && v.name && `от: ${v.name}`,
        ]),
      );
    }
  } catch (e) {
    console.error("submit", kind, e);
    return bad(500, "server");
  }

  return ok();
}
