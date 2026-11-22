import type { SupabaseClient } from "@supabase/supabase-js";
import type { PublicEpisode, PublicIdea, PublicNews, PublicStats } from "../types";

/**
 * Public reads, shared by the server (build time / ISR) and the browser (live refresh on
 * the static site), so both always show the same thing.
 */
function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "unknown"}`);
}

export async function queryNews(db: SupabaseClient, limit = 12): Promise<PublicNews[]> {
  const { data, error } = await db
    .from("submissions_news")
    .select("id, headline, happened_on, created_at")
    .eq("published", true)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) fail("publishedNews", error);
  return (data ?? []).filter((n) => n.headline).map((n) => ({ id: n.id, headline: n.headline!, happened_on: n.happened_on }));
}

export async function queryIdeas(db: SupabaseClient): Promise<PublicIdea[]> {
  const { data, error } = await db
    .from("submissions_ideas")
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
}

export async function queryEpisodes(db: SupabaseClient): Promise<PublicEpisode[]> {
  const { data, error } = await db
    .from("episodes")
    .select("id, number, title, guest, description, video_url, published_on")
    .eq("is_published", true)
    .order("number", { ascending: false });
  if (error) fail("episodes", error);
  return data ?? [];
}

export async function queryStats(db: SupabaseClient): Promise<PublicStats> {
  const { data, error } = await db.rpc("public_stats");
  if (error) fail("stats", error);
  return data as PublicStats;
}
