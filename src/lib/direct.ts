"use client";
import { publicDb } from "./supabase/public";
import { queryEpisodes, queryIdeas, queryNews, queryStats } from "./repo/public-queries";
import { photoPath, TABLE, toRow } from "./submission";
import type { Kind } from "./types";

/**
 * The static site's "backend": the browser writes to Supabase itself.
 * Row Level Security only lets it insert the student columns, and a trigger
 * in the database rate-limits by IP.
 */

export async function submitDirect(kind: Kind, payload: unknown, photo?: File | null): Promise<"ok" | "rate_limited" | "error"> {
  const db = publicDb();
  const { row } = toRow(kind, payload);
  let photo_path: string | null = null;
  if (kind === "news" && photo) {
    const path = photoPath(photo.type, crypto.randomUUID());
    const { error } = await db.storage.from("news-photos").upload(path, photo, { contentType: photo.type, upsert: false });
    if (error) return "error";
    photo_path = path;
  }
  // No .select(): anon may insert but not read the row back.
  const record: Record<string, unknown> = kind === "news" ? { ...row, photo_path } : { ...row };
  const { error } = await db.from(TABLE[kind]).insert(record);
  if (!error) return "ok";
  return /rate_limited/.test(error.message) ? "rate_limited" : "error";
}

const DEVICE_KEY = "skv:device";

function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

/** One vote per idea per browser. Returns the new count, or null if the vote didn't count. */
export async function voteDirect(ideaId: string): Promise<number | null> {
  const { data, error } = await publicDb().rpc("vote_idea", { p_idea: ideaId, p_device: deviceId() });
  if (error || !data || typeof data.count !== "number") return null;
  return data.count as number;
}

/** Everything the home page shows, fresh from the database. */
export async function fetchHome() {
  const db = publicDb();
  const [news, ideas, episodes, stats] = await Promise.all([queryNews(db), queryIdeas(db), queryEpisodes(db), queryStats(db)]);
  return { news, ideas, episodes, stats };
}
