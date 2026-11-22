import { ideaSchema, newsSchema, participateSchema, resolveNewsDate } from "./schemas";
import type { Kind } from "./types";
import type { NewIdea, NewNews, NewParticipate } from "./repo/types";

export const SUBMIT_SCHEMAS = { participate: participateSchema, ideas: ideaSchema, news: newsSchema } as const;

/** Humans need more than this to fill any of the forms. */
export const MIN_FILL_MS = 2500;

export type SubmissionRow =
  | { kind: "participate"; row: NewParticipate }
  | { kind: "ideas"; row: NewIdea }
  | { kind: "news"; row: NewNews };

/** Form payload (already valid) -> database row. One mapping for the API route and the browser. */
export function toRow(kind: Kind, payload: unknown): SubmissionRow {
  if (kind === "participate") {
    const v = participateSchema.parse(payload);
    return {
      kind,
      row: { name: v.name, grade: `${v.grade}${v.letter}`, role: v.role, pitch: v.pitch, contact_type: v.contact_type, contact: v.contact, consent: v.consent },
    };
  }
  if (kind === "ideas") {
    const v = ideaSchema.parse(payload);
    return { kind, row: { idea: v.idea, category: v.category, name: v.name } };
  }
  const v = newsSchema.parse(payload);
  const anonymous = !v.signed;
  return {
    kind,
    row: {
      what: v.what,
      happened_on: resolveNewsDate(v.when, v.date),
      when_preset: v.when,
      source: v.source,
      is_anonymous: anonymous,
      name: anonymous ? null : v.name,
    },
  };
}

export const TABLE: Record<Kind, string> = {
  participate: "submissions_participate",
  ideas: "submissions_ideas",
  news: "submissions_news",
};

/** Storage path for a news photo. Must match the upload policy in 0002_team_accounts.sql. */
export function photoPath(type: string, id: string) {
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
  return `${new Date().toISOString().slice(0, 7)}/${id}.${ext}`;
}
