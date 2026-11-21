export const STATUSES = ["new", "in_progress", "approved", "rejected"] as const;
export type Status = (typeof STATUSES)[number];

export const ROLES = ["guest", "rubric", "team_shoot", "team_edit", "team_script"] as const;
export type Role = (typeof ROLES)[number];

export const CATEGORIES = ["topic", "rubric", "question"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CONTACT_TYPES = ["telegram", "instagram"] as const;
export type ContactType = (typeof CONTACT_TYPES)[number];

export const KINDS = ["participate", "ideas", "news"] as const;
export type Kind = (typeof KINDS)[number];

export const WHEN_PRESETS = ["today", "yesterday", "week", "date"] as const;
export type WhenPreset = (typeof WHEN_PRESETS)[number];

export type ParticipateRow = {
  id: string;
  created_at: string;
  name: string;
  grade: string;
  role: Role;
  pitch: string;
  contact_type: ContactType;
  contact: string;
  consent: boolean;
  status: Status;
  admin_note: string | null;
};

export type IdeaRow = {
  id: string;
  created_at: string;
  idea: string;
  category: Category;
  name: string | null;
  status: Status;
  published: boolean;
  public_text: string | null;
  votes_count: number;
  admin_note: string | null;
};

export type NewsRow = {
  id: string;
  created_at: string;
  what: string;
  happened_on: string | null;
  when_preset: WhenPreset;
  source: string | null;
  photo_path: string | null;
  is_anonymous: boolean;
  name: string | null;
  status: Status;
  published: boolean;
  headline: string | null;
  admin_note: string | null;
};

export type Platform = "youtube" | "instagram" | "tiktok" | "other";

export type EpisodeRow = {
  id: string;
  created_at: string;
  number: number;
  title: string;
  guest: string | null;
  description: string | null;
  video_url: string | null;
  published_on: string | null;
  is_published: boolean;
};

/** What the public site is allowed to see. */
export type PublicIdea = Pick<IdeaRow, "id" | "created_at" | "category" | "votes_count"> & { text: string };
export type PublicNews = { id: string; headline: string; happened_on: string | null };
export type PublicEpisode = Omit<EpisodeRow, "is_published" | "created_at">;
export type PublicStats = Record<Kind, number>;

export type AdminRow =
  | ({ kind: "participate" } & ParticipateRow)
  | ({ kind: "ideas" } & IdeaRow)
  | ({ kind: "news" } & NewsRow & { photo_url?: string | null });
