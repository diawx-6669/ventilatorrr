import type {
  AdminRow,
  EpisodeRow,
  IdeaRow,
  Kind,
  NewsRow,
  ParticipateRow,
  PublicEpisode,
  PublicIdea,
  PublicNews,
  PublicStats,
} from "../types";
import type { AdminPatch, EpisodeInput } from "../schemas";

export type NewParticipate = Omit<ParticipateRow, "id" | "created_at" | "status" | "admin_note">;
export type NewIdea = Pick<IdeaRow, "idea" | "category" | "name">;
export type NewNews = Pick<NewsRow, "what" | "happened_on" | "when_preset" | "source" | "is_anonymous" | "name">;
export type PhotoUpload = { bytes: Uint8Array; type: string };

export interface Repo {
  mode: "supabase" | "demo";

  publishedNews(limit?: number): Promise<PublicNews[]>;
  publishedIdeas(): Promise<PublicIdea[]>;
  episodes(): Promise<PublicEpisode[]>;
  stats(): Promise<PublicStats>;

  createParticipate(row: NewParticipate): Promise<void>;
  createIdea(row: NewIdea): Promise<void>;
  createNews(row: NewNews, photo: PhotoUpload | null): Promise<void>;

  /** Returns the new count, or null when the idea isn't votable. `accepted` is false for a repeat vote. */
  vote(ideaId: string, voterHash: string): Promise<{ count: number; accepted: boolean } | null>;
  /** True when the request is allowed. */
  rateLimit(keyHash: string, max: number, windowSeconds: number): Promise<boolean>;
}

/**
 * Admin operations behind our own /api/admin routes. Only the demo store implements them:
 * with Supabase, the admin panel calls the `admin_*` database functions from the browser.
 */
export interface AdminRepo {
  adminList(kind: Kind): Promise<AdminRow[]>;
  adminDelete(kind: Kind, id: string): Promise<void>;
  adminPatch(patch: AdminPatch): Promise<void>;
  adminEpisodes(): Promise<EpisodeRow[]>;
  adminSaveEpisode(input: EpisodeInput, id?: string): Promise<void>;
  adminDeleteEpisode(id: string): Promise<void>;
}
