import Image from "next/image";
import { site, type BrandColor } from "@/config/site";
import { fitVar } from "@/lib/fit";
import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/dictionary";
import { Tilt } from "./tilt";
import { Reveal, RevealItem } from "./reveal";

const bg: Record<BrandColor, string> = {
  lime: "bg-lime text-ink [--stroke:var(--color-ink)]",
  pink: "bg-pink text-ink [--stroke:var(--color-ink)]",
  blue: "bg-blue text-paper [--stroke:var(--color-paper)]",
  orange: "bg-orange text-ink [--stroke:var(--color-ink)]",
};
const tilt = ["md:-rotate-[4deg] md:translate-y-6", "md:rotate-[2.5deg] md:-translate-y-2", "md:-rotate-[1.5deg] md:translate-y-10"];

/** Collectible-card style hosts. Photos go in /public/hosts and src/config/site.ts. */
export function Hosts({ t, locale }: { t: Dictionary; locale: Locale }) {
  return (
    <section id="hosts" aria-labelledby="hosts-title" className="relative z-10 py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-[var(--gutter)]">
        <h2 id="hosts-title" className="display [--wdth:115%] text-[min(clamp(34px,7vw,88px),calc((min(100vw,1400px)-2*var(--gutter))/(var(--n)*1.2)))]" style={fitVar(t.hosts.title)}>
          {t.hosts.title}
        </h2>
      </div>
      <Reveal
        as="ul"
        className="rail mx-auto mt-10 flex max-w-[1400px] gap-4 overflow-x-auto px-[var(--gutter)] pb-10 pt-4 [scroll-padding-inline:var(--gutter)] md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:pb-16"
      >
        {site.hosts.map((h, i) => (
          <RevealItem as="li" key={h.id} className={`w-[76vw] max-w-[340px] shrink-0 md:w-auto md:max-w-none ${tilt[i % 3]}`}>
            <Tilt className={`aspect-[4/5] overflow-hidden rounded-[28px] ${bg[h.color]}`}>
              <article className="relative flex h-full flex-col p-5 sm:p-6">
                {h.photo ? (
                  <Image src={h.photo} alt="" fill sizes="(min-width: 768px) 33vw, 76vw" className="object-cover mix-blend-luminosity" />
                ) : (
                  <>
                    <div className="halftone absolute inset-0 [mask-image:linear-gradient(to_bottom,black_30%,transparent_85%)]" aria-hidden />
                    <span
                      aria-hidden
                      className="display relative -ml-1 text-[clamp(110px,30vw,190px)] leading-[0.8] text-transparent [--wdth:90%] [-webkit-text-stroke:2.5px_var(--stroke)] md:text-[clamp(110px,11vw,190px)]"
                    >
                      {h.initials}
                    </span>
                  </>
                )}
                <div className="relative mt-auto">
                  <span className="mb-3 inline-block rounded-full bg-ink px-3 py-1 text-[13px] font-bold text-paper">{t.hosts.role}</span>
                  <h3
                    style={fitVar(h.name[locale])}
                    className="display leading-[0.95] [--wdth:100%] text-[min(34px,calc((min(76vw,340px)-40px)/(var(--n)*1.22)))] md:text-[min(36px,calc(((min(100vw,1400px)-2*var(--gutter)-64px)/3-48px)/(var(--n)*1.22)))]"
                  >
                    {h.name[locale]}
                  </h3>
                  {h.instagram && (
                    <a href={`https://instagram.com/${h.instagram}`} className="mt-2 inline-block text-sm font-semibold underline underline-offset-4" rel="noopener" target="_blank">
                      @{h.instagram}
                    </a>
                  )}
                </div>
              </article>
            </Tilt>
          </RevealItem>
        ))}
      </Reveal>
    </section>
  );
}
