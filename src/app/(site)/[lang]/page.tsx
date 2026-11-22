import { repo } from "@/lib/repo";
import { getDictionary } from "@/i18n/dictionary";
import type { Locale } from "@/i18n/config";
import { Hero } from "@/components/site/hero";
import { Hosts } from "@/components/site/hosts";
import { LiveHome } from "@/components/site/live-home";

// Re-render at most once a minute; admin actions refresh it immediately.
export const revalidate = 60;

/** A broken database must not take the whole page down: each block falls back on its own. */
async function safe<T>(label: string, p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.error(label, e);
    return fallback;
  }
}

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const t = getDictionary(locale);

  const [news, ideas, episodes, stats] = await Promise.all([
    safe("news", repo.publishedNews(12), []),
    safe("ideas", repo.publishedIdeas(), []),
    safe("episodes", repo.episodes(), []),
    safe("stats", repo.stats(), null),
  ]);

  return (
    <>
      <Hero />
      <LiveHome initial={{ news, ideas, episodes, stats }} hosts={<Hosts t={t} locale={locale} />} />
    </>
  );
}
