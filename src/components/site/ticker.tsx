import type { Dictionary } from "@/i18n/dictionary";
import type { PublicNews } from "@/lib/types";

/** School news crawl. Only news a team member approved and published. */
export function Ticker({ news, t }: { news: PublicNews[]; t: Dictionary }) {
  const items = news.length ? news.map((n) => n.headline) : [t.ticker.empty];
  // Repeat short lists so one copy is always wider than the screen.
  const base = Array.from({ length: Math.max(1, Math.ceil(6 / items.length)) }, () => items).flat();
  const duration = Math.max(28, base.join(" ").length * 0.22);

  return (
    <section aria-label={t.ticker.label} className="relative z-10 -mt-6 overflow-hidden py-10 sm:-mt-10">
      <div className="on-orange relative left-1/2 flex w-[112vw] -translate-x-1/2 -rotate-[2.2deg] items-stretch bg-orange text-ink shadow-[0_20px_60px_-20px_rgb(255_106_19/0.6)]">
        <div className="relative z-10 flex shrink-0 items-center gap-2 bg-ink py-3 pl-[calc(6vw+var(--gutter))] pr-5 text-paper sm:py-4">
          <span className="size-2.5 rotate-45 bg-orange" aria-hidden />
          <span className="display text-[15px] uppercase [--wdth:150%] sm:text-lg">{t.ticker.label}</span>
        </div>
        <div className="flex min-w-0 flex-1 overflow-hidden motion-reduce:overflow-x-auto">
          <ul
            className="flex w-max shrink-0 animate-marquee items-center py-3 sm:py-4"
            style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
          >
            {[0, 1].map((copy) =>
              base.map((headline, i) => (
                <li key={`${copy}-${i}`} aria-hidden={copy === 1 || i >= items.length ? true : undefined} className="flex items-center whitespace-nowrap">
                  <span className="px-5 text-[17px] font-bold sm:text-xl">{headline}</span>
                  <span className="size-2 rotate-45 bg-ink" aria-hidden />
                </li>
              )),
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
