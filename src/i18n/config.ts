export const locales = ["ru", "kk", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ru";

export const localeLabels: Record<Locale, { short: string; long: string; htmlLang: string }> = {
  kk: { short: "ҚАЗ", long: "Қазақша", htmlLang: "kk" },
  ru: { short: "РУС", long: "Русский", htmlLang: "ru" },
  en: { short: "ENG", long: "English", htmlLang: "en" },
};

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

/** Path for a locale. Russian lives at the root, others get a prefix. */
export function localePath(locale: Locale, path = "/"): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (locale === defaultLocale) return clean;
  return clean === "/" ? `/${locale}` : `/${locale}${clean}`;
}

export const LOCALE_COOKIE = "lang";

/** canonical + hreflang links for one page in every language. */
export function alternates(locale: Locale, path = "/") {
  return {
    canonical: localePath(locale, path),
    languages: Object.fromEntries([
      ...locales.map((l) => [localeLabels[l].htmlLang, localePath(l, path)]),
      ["x-default", localePath(defaultLocale, path)],
    ]),
  };
}
