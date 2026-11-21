"use client";
import Link from "next/link";
import { InstagramLogo, TiktokLogo, YoutubeLogo, QrCode } from "@phosphor-icons/react/dist/ssr";
import { site } from "@/config/site";
import { localePath } from "@/i18n/config";
import { useDict, useLocale } from "@/components/providers";

export function Footer({ demo }: { demo: boolean }) {
  const t = useDict();
  const locale = useLocale();
  const name = locale === "en" ? site.nameLatin : site.name;
  const socials = [
    { href: site.social.instagram, label: "Instagram", Icon: InstagramLogo },
    { href: site.social.tiktok, label: "TikTok", Icon: TiktokLogo },
    { href: site.social.youtube, label: "YouTube", Icon: YoutubeLogo },
  ];
  return (
    <footer className="no-print relative z-10 mt-10 overflow-hidden border-t border-white/10 pb-10 pt-14">
      <div className="mx-auto max-w-[1400px] px-[var(--gutter)]">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-lg font-semibold text-paper/85">
              {t.footer.made} {site.school[locale]}
            </p>
            <ul className="mt-5 flex gap-3">
              {socials.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener" aria-label={label} className="grid size-12 place-items-center rounded-full bg-white/8 ring-1 ring-white/15 transition-colors hover:bg-paper hover:text-ink">
                    <Icon weight="bold" className="size-6" aria-hidden />
                  </a>
                </li>
              ))}
              <li>
                <Link href={localePath(locale, "/qr")} className="flex h-12 items-center gap-2 rounded-full bg-white/8 px-5 font-semibold ring-1 ring-white/15 transition-colors hover:bg-paper hover:text-ink">
                  <QrCode weight="bold" className="size-6" aria-hidden />
                  {t.footer.poster}
                </Link>
              </li>
            </ul>
          </div>
          <p className="max-w-[44ch] text-[15px] text-paper/75">{t.forms.rule}</p>
        </div>
        {demo && <p className="mt-8 rounded-2xl bg-orange/15 px-4 py-3 text-sm text-paper/90 ring-1 ring-orange/40">{t.footer.demo}</p>}
      </div>
      {/* Decorative: drawn with ::before so it isn't text for screen readers or contrast checkers. */}
      <div
        aria-hidden
        data-text={name}
        className="display pointer-events-none mt-12 select-none whitespace-nowrap px-[var(--gutter)] leading-[0.8] text-transparent [--wdth:125%] [-webkit-text-stroke:1.5px_rgb(245_246_255/0.22)] before:content-[attr(data-text)]"
        style={{ fontSize: `calc((100vw - 2 * var(--gutter)) / ${name.length * 1.1})` }}
      />
    </footer>
  );
}
