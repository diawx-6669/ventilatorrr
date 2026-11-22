import { z } from "zod";
import { CATEGORIES, CONTACT_TYPES, ROLES, STATUSES, WHEN_PRESETS } from "./types";

/**
 * Shared by the browser and the server. Error messages are keys that the
 * form maps to the current language, so the schema stays language-free.
 */
const trimmed = (min: number, max: number) =>
  z
    .string({ error: "required" })
    .transform((s) => s.replace(/\s+/g, " ").trim())
    .pipe(z.string().min(1, { error: "required" }).min(min, { error: `tooShort:${min}` }).max(max, { error: `tooLong:${max}` }));

const optionalTrimmed = (max: number) =>
  z
    .string()
    .optional()
    .transform((s) => (s ?? "").replace(/\s+/g, " ").trim())
    .pipe(z.string().max(max, { error: `tooLong:${max}` }))
    .transform((s) => (s.length ? s : null));

/** Long free text keeps its line breaks. */
const paragraph = (min: number, max: number) =>
  z
    .string({ error: "required" })
    .transform((s) => s.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim())
    .pipe(z.string().min(1, { error: "required" }).min(min, { error: `tooShort:${min}` }).max(max, { error: `tooLong:${max}` }));

export const GRADES = ["7", "8", "9", "10", "11", "12"] as const;

export const participateSchema = z.object({
  name: trimmed(2, 40),
  grade: z.enum(GRADES, { error: "chooseOne" }),
  letter: z
    .string()
    .optional()
    .transform((s) => (s ?? "").trim().toUpperCase())
    .pipe(z.string().max(2, { error: "tooLong:2" }).regex(/^[A-ZА-ЯӘҒҚҢӨҰҮҺІЁ]*$/u, { error: "required" })),
  role: z.enum(ROLES, { error: "chooseOne" }),
  pitch: paragraph(20, 600),
  contact_type: z.enum(CONTACT_TYPES, { error: "chooseOne" }),
  contact: z
    .string({ error: "required" })
    .transform((s) => s.trim().replace(/^@/, "").replace(/^https?:\/\/(www\.)?(t\.me|instagram\.com)\//i, "").replace(/\/$/, ""))
    .pipe(z.string().min(1, { error: "required" }).regex(/^[A-Za-z0-9._]{3,32}$/, { error: "handle" })),
  consent: z.literal(true, { error: "consent" }),
});

export const ideaSchema = z.object({
  idea: paragraph(10, 500),
  category: z.enum(CATEGORIES, { error: "chooseOne" }),
  name: optionalTrimmed(40),
});

export const newsSchema = z
  .object({
    what: paragraph(15, 1000),
    when: z.enum(WHEN_PRESETS, { error: "chooseOne" }),
    date: z.string().optional(),
    source: optionalTrimmed(300),
    signed: z.boolean().default(false),
    name: optionalTrimmed(40),
  })
  .superRefine((v, ctx) => {
    if (v.when === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v.date ?? "")) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "required" });
    }
    if (v.signed && !v.name) {
      ctx.addIssue({ code: "custom", path: ["name"], message: "required" });
    }
  });

export type ParticipateInput = z.input<typeof participateSchema>;
export type IdeaInput = z.input<typeof ideaSchema>;
export type NewsInput = z.input<typeof newsSchema>;

export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PHOTO_MAX_BYTES = 8 * 1024 * 1024;

/** Admin edits. */
export const adminPatchSchema = z.object({
  kind: z.enum(["participate", "ideas", "news"]),
  id: z.string().min(1).max(64),
  status: z.enum(STATUSES).optional(),
  published: z.boolean().optional(),
  public_text: z.string().trim().max(500).nullable().optional(),
  headline: z.string().trim().max(140).nullable().optional(),
  admin_note: z.string().trim().max(1000).nullable().optional(),
});
export type AdminPatch = z.infer<typeof adminPatchSchema>;

export const episodeSchema = z.object({
  number: z.coerce.number().int().min(0).max(999),
  title: z.string().trim().min(2).max(140),
  guest: z.string().trim().max(80).nullish().transform((s) => s || null),
  description: z.string().trim().max(500).nullish().transform((s) => s || null),
  video_url: z
    .string()
    .trim()
    .max(300)
    .nullish()
    .transform((s) => s || null)
    .refine((s) => s === null || /^https:\/\//.test(s), { message: "https link" }),
  published_on: z
    .string()
    .nullish()
    .transform((s) => s || null)
    .refine((s) => s === null || /^\d{4}-\d{2}-\d{2}$/.test(s)),
  is_published: z.boolean().default(true),
});
export type EpisodeInput = z.infer<typeof episodeSchema>;

/** Turn the news "when" preset into a date, in Astana time. */
export function resolveNewsDate(when: (typeof WHEN_PRESETS)[number], date?: string): string | null {
  const astanaNow = new Date(Date.now() + 5 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  if (when === "today") return iso(astanaNow);
  if (when === "yesterday") return iso(new Date(astanaNow.getTime() - 86400000));
  if (when === "date") return date ?? null;
  return null;
}
