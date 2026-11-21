import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../../globals.css";
import { fontClasses } from "../../fonts";
import { withBase } from "@/lib/deploy";
import { site } from "@/config/site";
import { alternates, isLocale, localeLabels, locales, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { Providers } from "@/components/providers";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Cursor } from "@/components/site/cursor";
import { hasSupabase } from "@/lib/env";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const dynamicParams = false;

export const viewport: Viewport = {
  themeColor: "#080b1c",
  colorScheme: "dark",
};

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  const t = getDictionary(lang);
  const name = lang === "en" ? site.nameLatin : site.name;
  const title = `${name}: ${lang === "en" ? "school talk show" : lang === "kk" ? "мектеп ток-шоуы" : "школьное ток-шоу"}`;
  return {
    metadataBase: new URL(site.url),
    title: { default: title, template: `%s | ${name}` },
    description: t.meta.description,
    alternates: alternates(lang, "/"),
    openGraph: { title, description: t.meta.description, type: "website", locale: localeLabels[lang].htmlLang },
    icons: { icon: withBase("/icon.svg") },
  };
}

export default async function SiteLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const t = getDictionary(locale);

  return (
    <html lang={localeLabels[locale].htmlLang} className={fontClasses}>
      <body>
        <a
          href="#main"
          className="sr-only z-[80] rounded-full bg-lime px-5 py-3 font-semibold text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {t.nav.skip}
        </a>
        <div className="mesh" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </div>
        <div className="grain" aria-hidden />
        <Providers locale={locale}>
          <Header />
          <main id="main" className="relative z-10">
            {children}
          </main>
          <Footer demo={!hasSupabase} />
          <Cursor />
        </Providers>
      </body>
    </html>
  );
}
