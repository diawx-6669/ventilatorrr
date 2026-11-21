"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useMotionValueEvent, useScroll } from "motion/react";
import { site } from "@/config/site";
import { LOCALE_COOKIE, localeLabels, localePath, locales, isLocale } from "@/i18n/config";
import { useDict, useLocale } from "@/components/providers";
import { FanMark } from "./fan-mark";

export function Header() {
  const t = useDict();
  const locale = useLocale();
  const pathname = usePathname() ?? "/";
  const first = pathname.split("/")[1];
  const rest = isLocale(first) ? pathname.slice(first.length + 1) || "/" : pathname;
  const home = localePath(locale);
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  // Only flips at the threshold, so this re-renders twice per page, not per frame.
  useMotionValueEvent(scrollY, "change", (y) => setSolid(y > 24));

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300 ${
        solid ? "bg-ink/80 shadow-[0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-lg" : ""
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-[var(--gutter)]">
        <Link href={home} className="group flex items-center gap-2.5 rounded-full py-1 pr-2" aria-label={`${site.name}, ${t.nav.home}`}>
          <FanMark className="size-9 shrink-0" spin />
          <span className="display hidden text-[15px] [--wdth:150%] sm:inline">{locale === "en" ? site.nameLatin : site.name}</span>
        </Link>

        <span className="flex items-center gap-1.5 rounded-full bg-ink/70 px-2.5 py-1 text-[12px] font-bold tracking-wide ring-1 ring-white/15 backdrop-blur">
          <span className="size-2 animate-live rounded-full bg-live motion-reduce:animate-none" aria-hidden />
          {t.live}
        </span>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 rounded-full bg-ink/60 p-1 ring-1 ring-white/10 backdrop-blur md:flex">
          {[
            ["#episodes", t.nav.episodes],
            ["#ideas", t.nav.ideas],
            ["#hosts", t.nav.hosts],
          ].map(([hash, label]) => (
            <Link key={hash} href={`${home === "/" ? "" : home}/${hash}`} className="rounded-full px-4 py-2 text-sm font-medium text-paper/85 transition-colors hover:bg-white/10 hover:text-paper">
              {label}
            </Link>
          ))}
        </nav>

        <nav aria-label={t.nav.language} className="ml-auto flex items-center rounded-full bg-ink/60 p-1 ring-1 ring-white/10 backdrop-blur md:ml-2">
          {locales.map((l) => {
            const active = l === locale;
            return (
              <a
                key={l}
                href={localePath(l, rest)}
                hrefLang={localeLabels[l].htmlLang}
                lang={localeLabels[l].htmlLang}
                aria-current={active ? "true" : undefined}
                aria-label={localeLabels[l].long}
                onClick={() => {
                  document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
                }}
                className={`grid h-9 min-w-11 place-items-center rounded-full px-2.5 text-[12px] font-bold tracking-wide transition-colors ${
                  active ? "bg-paper text-ink" : "text-paper/80 hover:bg-white/10 hover:text-paper"
                }`}
              >
                {localeLabels[l].short}
              </a>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
