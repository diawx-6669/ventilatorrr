import "server-only";
import { randomUUID } from "node:crypto";
import { anonClient, serviceClient, sessionClient } from "../supabase/clients";
import type { AdminRow, EpisodeRow, IdeaRow, Kind, NewsRow, ParticipateRow } from "../types";
import type { Repo } from "./types";
import { demoRepo } from "./demo";

const TABLE: Record<Kind, string> = {
  participate: "submissions_participate",
  ideas: "submissions_ideas",
  news: "submissions_news",
};

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "unknown"}`);
}

export const supabaseRepo: Repo = {
  mode: "supabase",

  async publishedNews(limit = 12) {
    const { data, error } = await anonClient()
      .from(TABLE.news)
      .select("id, headline, happened_on, created_at")
      .eq("published", true)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) fail("publishedNews", error);
    return (data ?? []).filter((n) => n.headline).map((n) => ({ id: n.id, headline: n.headline!, happened_on: n.happened_on }));
  },

  async publishedIdeas() {
    const { data, error } = await anonClient()
      .from(TABLE.ideas)
      .select("id, created_at, category, votes_count, public_text")
      .eq("published", true)
      .eq("status", "approved")
      .order("votes_count", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) fail("publishedIdeas", error);
    return (data ?? [])
      .filter((i) => i.public_text)
      .map((i) => ({ id: i.id, created_at: i.created_at, category: i.category, votes_count: i.votes_count, text: i.public_text! }));
  },

  async episodes() {
    const { data, error } = await anonClient()
      .from("episodes")
      .select("id, number, title, guest, description, video_url, published_on")
      .eq("is_published", true)
      .order("number", { ascending: false });
    if (error) fail("episodes", error);
    return data ?? [];
  },

  async stats() {
    const { data, error } = await anonClient().rpc("public_stats");
    if (error) fail("stats", error);
    return data as { participate: number; ideas: number; news: number };
  },

  async createParticipate(row) {
    const { error } = await anonClient().from(TABLE.participate).insert(row);
    if (error) fail("createParticipate", error);
  },

  async createIdea(row) {
    const { error } = await anonClient().from(TABLE.ideas).insert(row);
    if (error) fail("createIdea", error);
  },

  async createNews(row, photo) {
    let photo_path: string | null = null;
    if (photo) {
      const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
      const path = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
      const uploader = serviceClient() ?? anonClient();
      const { error } = await uploader.storage.from("news-photos").upload(path, photo.bytes, { contentType: photo.type, upsert: false });
      if (error) fail("uploadPhoto", error);
      photo_path = path;
    }
    const { error } = await anonClient().from(TABLE.news).insert({ ...row, photo_path });
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

  async adminList(kind) {
    const db = await sessionClient();
    const { data, error } = await db.from(TABLE[kind]).select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) fail("adminList", error);
    if (kind === "news") {
      const rows = (data ?? []) as NewsRow[];
      const paths = rows.map((r) => r.photo_path).filter((p): p is string => !!p);
      const signed = new Map<string, string>();
      if (paths.length) {
        const { data: urls } = await db.storage.from("news-photos").createSignedUrls(paths, 60 * 60);
        urls?.forEach((u) => u.path && u.signedUrl && signed.set(u.path, u.signedUrl));
      }
      return rows.map((r) => ({ kind, ...r, photo_url: r.photo_path ? (signed.get(r.photo_path) ?? null) : null }));
    }
    if (kind === "ideas") return ((data ?? []) as IdeaRow[]).map((r) => ({ kind, ...r }));
    return ((data ?? []) as ParticipateRow[]).map((r) => ({ kind, ...r })) as AdminRow[];
  },

  async adminPatch(patch) {
    const db = await sessionClient();
    const { kind, id, ...changes } = patch;
    const clean = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
    const { error } = await db.from(TABLE[kind]).update(clean).eq("id", id);
    if (error) fail("adminPatch", error);
  },

  async adminEpisodes() {
    const db = await sessionClient();
    const { data, error } = await db.from("episodes").select("*").order("number", { ascending: false });
    if (error) fail("adminEpisodes", error);
    return (data ?? []) as EpisodeRow[];
  },

  async adminSaveEpisode(input, id) {
    const db = await sessionClient();
    const { error } = id ? await db.from("episodes").update(input).eq("id", id) : await db.from("episodes").insert(input);
    if (error) fail("adminSaveEpisode", error);
  },

  async adminDeleteEpisode(id) {
    const db = await sessionClient();
    const { error } = await db.from("episodes").delete().eq("id", id);
    if (error) fail("adminDeleteEpisode", error);
  },
};
