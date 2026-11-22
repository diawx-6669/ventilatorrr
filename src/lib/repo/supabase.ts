import "server-only";
import { randomUUID } from "node:crypto";
import { anonClient, serviceClient } from "../supabase/clients";
import { photoPath, TABLE } from "../submission";
import { queryEpisodes, queryIdeas, queryNews, queryStats } from "./public-queries";
import type { Repo } from "./types";
import { demoRepo } from "./demo";

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "unknown"}`);
}

/**
 * Inserts go through the service key when it's set: the API route already rate-limits per
 * student, and the database's per-IP brake would otherwise see every student as our server.
 */
const writer = () => serviceClient() ?? anonClient();

export const supabaseRepo: Repo = {
  mode: "supabase",

  publishedNews: (limit = 12) => queryNews(anonClient(), limit),
  publishedIdeas: () => queryIdeas(anonClient()),
  episodes: () => queryEpisodes(anonClient()),
  stats: () => queryStats(anonClient()),

  async createParticipate(row) {
    const { error } = await writer().from(TABLE.participate).insert(row);
    if (error) fail("createParticipate", error);
  },

  async createIdea(row) {
    const { error } = await writer().from(TABLE.ideas).insert(row);
    if (error) fail("createIdea", error);
  },

  async createNews(row, photo) {
    let photo_path: string | null = null;
    if (photo) {
      const path = photoPath(photo.type, randomUUID());
      const { error } = await writer().storage.from("news-photos").upload(path, photo.bytes, { contentType: photo.type, upsert: false });
      if (error) fail("uploadPhoto", error);
      photo_path = path;
    }
    const { error } = await writer().from(TABLE.news).insert({ ...row, photo_path });
    if (error) fail("createNews", error);
  },

  async vote(ideaId, voterHash) {
    const svc = serviceClient();
    if (!svc) throw new Error("vote: SUPABASE_SERVICE_ROLE_KEY is not set");
    const { data, error } = await svc.rpc("cast_vote", { p_idea: ideaId, p_voter: voterHash });
    if (error) fail("vote", error);
    return (data as { count: number; accepted: boolean } | null) ?? null;
  },

  async rateLimit(keyHash, max, windowSeconds) {
    // Cheap per-instance check first, then the shared one in Postgres when the service key is set.
    if (!(await demoRepo.rateLimit(keyHash, max, windowSeconds))) return false;
    const svc = serviceClient();
    if (!svc) return true;
    const { data, error } = await svc.rpc("hit_rate_limit", { p_key: keyHash, p_max: max, p_window_seconds: windowSeconds });
    if (error) {
      console.error("rateLimit", error.message);
      return true; // fail open: a broken limiter must not block real students
    }
    return data === true;
  },
};
