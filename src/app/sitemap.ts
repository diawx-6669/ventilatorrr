import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { localeLabels, localePath, locales } from "@/i18n/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["/", "/join", "/idea", "/news"].flatMap((path) =>
    locales.map((l) => ({
      url: new URL(localePath(l, path), site.url).toString(),
      changeFrequency: path === "/" ? ("daily" as const) : ("monthly" as const),
      priority: path === "/" ? 1 : 0.7,
      alternates: { languages: Object.fromEntries(locales.map((x) => [localeLabels[x].htmlLang, new URL(localePath(x, path), site.url).toString()])) },
    })),
  );
}
