"use client";
import Link from "next/link";
import { fitVar } from "@/lib/fit";
import { m } from "motion/react";
import { ArrowUpRight, Lightbulb, MicrophoneStage, Newspaper } from "@phosphor-icons/react/dist/ssr";
import { localePath } from "@/i18n/config";
import { useDict, useLocale } from "@/components/providers";
import type { PublicStats } from "@/lib/types";
import { Tilt } from "./tilt";
import { CountUp } from "./count-up";
import { FanMark } from "./fan-mark";
import { Reveal, revealItem } from "./reveal";

/** Three ways in. Colour = form: lime joins, blue ideas, pink news. */
export function Doors({ stats }: { stats: PublicStats | null }) {
  const t = useDict();
  const locale = useLocale();

  const doors = [
    {
      key: "join",
      href: "/join",
      title: t.cta.join,
      text: t.doors.join.text,
      count: stats?.participate,
      Icon: MicrophoneStage,
      tone: "on-lime bg-lime text-ink",
      layout: "md:col-span-7 md:row-span-2 min-h-[340px] md:min-h-[560px]",
      deco: (
        <FanMark className="pointer-events-none absolute -bottom-[18%] -right-[14%] size-[78%] opacity-[0.14] mix-blend-multiply grayscale motion-safe:animate-[spin_24s_linear_infinite]" />
      ),
    },
    {
      key: "idea",
      href: "/idea",
      title: t.cta.idea,
      text: t.doors.idea.text,
      count: stats?.ideas,
      Icon: Lightbulb,
      tone: "bg-blue text-paper",
      layout: "md:col-span-5 min-h-[260px]",
      deco: <div className="halftone pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-60 [mask-image:linear-gradient(to_left,black,transparent)]" />,
    },
    {
      key: "news",
      href: "/news",
      title: t.cta.news,
      text: t.doors.news.text,
      count: stats?.news,
      Icon: Newspaper,
      tone: "on-pink bg-pink text-ink",
      layout: "md:col-span-5 min-h-[260px]",
      deco: (
        <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background:repeating-linear-gradient(-45deg,var(--color-ink)_0_14px,transparent_14px_34px)] [mask-image:linear-gradient(to_top_left,black,transparent_60%)]" />
      ),
    },
  ];

  return (
    <section id="doors" aria-labelledby="doors-title" className="relative z-10 mx-auto max-w-[1400px] px-[var(--gutter)] pb-24 pt-10 sm:pb-32">
      <h2 id="doors-title" className="display mb-8 sm:mb-12 [--wdth:115%] text-[min(clamp(34px,7vw,88px),calc((min(100vw,1400px)-2*var(--gutter))/(var(--n)*1.2)))]" style={fitVar(t.doors.title)}>
        {t.doors.title}
      </h2>
      <Reveal className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
        {doors.map(({ key, href, title, text, count, Icon, tone, layout, deco }) => (
          <m.div key={key} variants={revealItem} className={layout}>
            <Tilt className={`h-full overflow-hidden rounded-[28px] ${tone}`} max={key === "join" ? 6 : 9}>
              <Link
                href={localePath(locale, href)}
                className="relative flex h-full flex-col gap-4 p-6 sm:p-8 focus-visible:outline-offset-[-6px]"
              >
                {deco}
                <span className="relative grid size-14 place-items-center rounded-full bg-ink/10 ring-1 ring-current/20 sm:size-16">
                  <Icon weight="duotone" className="size-8 sm:size-9" aria-hidden />
                </span>
                <span
                  style={fitVar(title)}
                  className={`display relative mt-auto block [--wdth:105%] ${
                    key === "join"
                      ? "text-[min(clamp(40px,7.4vw,104px),calc((100vw-2*var(--gutter)-48px)/(var(--n)*1.22)))] md:text-[min(104px,calc((min(100vw,1400px)*0.56-64px)/(var(--n)*1.22)))]"
                      : "text-[min(40px,calc((100vw-2*var(--gutter)-48px)/(var(--n)*1.22)))] md:text-[min(46px,calc((min(100vw,1400px)*0.4-64px)/(var(--n)*1.22)))]"
                  }`}
                >
                  {title}
                </span>
                <span className={`relative max-w-[34ch] font-medium leading-snug ${key === "join" ? "text-lg sm:text-xl" : "text-[17px]"}`}>{text}</span>
                <span className="relative flex items-center justify-between pt-2">
                  {typeof count === "number" ? (
                    <span className="rounded-full bg-ink/10 px-3.5 py-1.5 text-sm font-bold ring-1 ring-current/20">
                      <CountUp value={count} format={t.doors.count} />
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="grid size-12 place-items-center rounded-full bg-ink text-paper transition-transform duration-300 ease-out-expo group-hover:rotate-45" aria-hidden>
                    <ArrowUpRight weight="bold" className="size-6" />
                  </span>
                </span>
              </Link>
            </Tilt>
          </m.div>
        ))}
      </Reveal>
    </section>
  );
}
