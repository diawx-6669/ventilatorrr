"use client";
import { useState } from "react";
import { fitVar } from "@/lib/fit";
import { m } from "motion/react";
import { Play, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { useDict } from "@/components/providers";
import type { PublicEpisode } from "@/lib/types";
import { parseVideo } from "@/lib/video";
import { springTap } from "./spring";
import { SocialChips } from "./socials";

const posterTone = ["bg-blue", "bg-pink", "bg-ink-3", "bg-orange"];

/** Horizontal rail. Videos load only when tapped, so the page stays light. */
export function Episodes({ episodes }: { episodes: PublicEpisode[] }) {
  const t = useDict();
  return (
    <section id="episodes" aria-labelledby="episodes-title" className="relative z-10 py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-[var(--gutter)]">
        <h2 id="episodes-title" className="display [--wdth:115%] text-[min(clamp(34px,7vw,88px),calc((min(100vw,1400px)-2*var(--gutter))/(var(--n)*1.2)))]" style={fitVar(t.episodes.title)}>
          {t.episodes.title}
        </h2>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <p className="text-[15px] font-semibold text-paper/75">{t.social.episodes}:</p>
          <SocialChips />
        </div>
      </div>
      {episodes.length === 0 ? (
        <div className="mx-auto mt-8 max-w-[1400px] px-[var(--gutter)]">
          <p className="max-w-[40ch] rounded-[28px] border-2 border-dashed border-paper/25 p-8 text-lg text-paper/85">{t.episodes.empty}</p>
        </div>
      ) : (
        <ul className="rail mx-auto mt-10 flex max-w-[1400px] gap-4 overflow-x-auto px-[var(--gutter)] pb-4 [scroll-padding-inline:var(--gutter)] sm:gap-6">
          {episodes.map((ep, i) => (
            <li key={ep.id} className="shrink-0">
              <EpisodeCard ep={ep} tone={posterTone[i % posterTone.length]!} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EpisodeCard({ ep, tone }: { ep: PublicEpisode; tone: string }) {
  const t = useDict();
  const [playing, setPlaying] = useState(false);
  const video = parseVideo(ep.video_url);
  const vertical = video?.vertical ?? false;
  // Formatted by hand: Node and browsers ship different ICU data for Kazakh, which breaks hydration.
  const date = ep.published_on ? `${Number(ep.published_on.slice(8, 10))} ${t.episodes.months[Number(ep.published_on.slice(5, 7)) - 1]}` : null;

  return (
    <article className="w-[86vw] max-w-[560px] sm:w-[520px]" style={vertical ? { width: "min(62vw, 300px)" } : undefined}>
      <div className={`relative overflow-hidden rounded-[28px] ${vertical ? "aspect-[9/16]" : "aspect-video"} ${tone}`}>
        {playing && video ? (
          <iframe
            src={video.embed}
            title={ep.title}
            className="absolute inset-0 size-full"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <>
            {video?.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.thumb} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
            ) : (
              <div className="halftone absolute inset-0 opacity-70 [mask-image:radial-gradient(circle_at_80%_20%,black,transparent_70%)]" aria-hidden />
            )}
            <span
              aria-hidden
              className="display absolute -bottom-[0.12em] right-3 text-[clamp(120px,22vw,220px)] leading-none text-transparent opacity-80 [--wdth:80%] [-webkit-text-stroke:2px_rgb(245_246_255/0.85)]"
            >
              {String(ep.number).padStart(2, "0")}
            </span>
            {video && (
              <m.button
                {...springTap}
                type="button"
                onClick={() => setPlaying(true)}
                className="absolute left-5 top-5 flex h-14 items-center gap-2 rounded-full bg-paper pl-4 pr-6 font-bold text-ink shadow-xl"
              >
                <Play weight="fill" className="size-5" aria-hidden />
                {t.episodes.play}
                <span className="sr-only">: {ep.title}</span>
              </m.button>
            )}
          </>
        )}
      </div>
      <div className="mt-4 px-1">
        <p className="text-sm font-semibold text-paper/75">
          {t.episodes.episode(ep.number)}
          {date && <span> · {date}</span>}
        </p>
        <h3 className="mt-1 text-xl font-bold leading-tight sm:text-2xl">{ep.title}</h3>
        {ep.guest && (
          <p className="mt-1 text-paper/80">
            {t.episodes.guest}: {ep.guest}
          </p>
        )}
        {video && video.platform !== "youtube" && (
          <a href={ep.video_url!} target="_blank" rel="noopener" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-lime underline-offset-4 hover:underline">
            {t.episodes.openExternal}
            <ArrowUpRight className="size-4" aria-hidden />
          </a>
        )}
      </div>
    </article>
  );
}
