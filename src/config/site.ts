/**
 * Everything that identifies the show lives here.
 * Rename the show by editing `name` / `nameLines` only.
 */
export const site = {
  /** Working title. One place to change it. */
  name: "СКВОЗНЯКИ",
  /** Latin spelling for the English version and link previews. Matches the social handle. */
  nameLatin: "SKVOZNAKI",
  /**
   * How the name breaks into lines in the hero poster.
   * Must join back into `name` (hyphens are allowed). Leave empty to keep one line.
   */
  nameLines: ["СКВОЗ-", "НЯКИ"],
  nameLinesLatin: ["SKVOZ-", "NAKI"],

  school: {
    ru: "НИШ IB, Астана",
    kk: "НЗМ IB, Астана",
    en: "NIS IB, Astana",
  },

  /** Public URL, used for the QR poster and link previews. Override with NEXT_PUBLIC_SITE_URL. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",

  /** One handle everywhere. Shown next to the icons on the site and the QR poster. */
  handle: "skvoznaki",
  social: {
    instagram: "https://www.instagram.com/skvoznaki/",
    tiktok: "https://www.tiktok.com/@skvoznaki",
    youtube: "https://www.youtube.com/@skvoznaki",
  },

  /**
   * Hosts. Drop real photos into /public/hosts/<id>.jpg and set `photo`.
   * Until then the card renders a colour monogram.
   */
  hosts: [
    {
      id: "yerkin",
      name: { ru: "Еркін Ералы", kk: "Еркін Ералы", en: "Yerkin Yeraly" },
      initials: "ЕЕ",
      color: "lime" as const,
      photo: null as string | null,
      instagram: null as string | null,
    },
    {
      id: "khamza",
      name: { ru: "Хамза Қайыргелді", kk: "Хамза Қайыргелді", en: "Khamza Kaiyrgeldi" },
      initials: "ХҚ",
      color: "pink" as const,
      photo: null as string | null,
      instagram: null as string | null,
    },
    {
      id: "asanali",
      name: { ru: "Асанали Абдрахманов", kk: "Асанали Абдрахманов", en: "Asanali Abdrakhmanov" },
      initials: "АА",
      color: "blue" as const,
      photo: null as string | null,
      instagram: null as string | null,
    },
  ],
} as const;

export type BrandColor = "lime" | "blue" | "pink" | "orange";
