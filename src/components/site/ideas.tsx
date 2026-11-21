"use client";
import { useMemo, useState } from "react";
import { fitVar } from "@/lib/fit";
import { useStored, writeStored } from "@/lib/use-stored";
import { IS_STATIC } from "@/lib/deploy";
import { AnimatePresence, LayoutGroup, m } from "motion/react";
import { ArrowFatUp, CheckFat } from "@phosphor-icons/react/dist/ssr";
import { localePath } from "@/i18n/config";
import { useDict, useLocale } from "@/components/providers";
import type { Category, PublicIdea } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";
import { SpringLink, springTap } from "./spring";

const VOTED_KEY = "vent:voted";

function parseVoted(raw: string | null): Set<string> {
  try {
    return new Set(JSON.parse(raw ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

/** Leaderboard of approved ideas. One vote per idea per device; the list re-sorts live. */
export function Ideas({ ideas: initial }: { ideas: PublicIdea[] }) {
  const t = useDict();
  const locale = useLocale();
  const [ideas, setIdeas] = useState(initial);
  const votedRaw = useStored(VOTED_KEY);
  const voted = useMemo(() => parseVoted(votedRaw), [votedRaw]);
  const [filter, setFilter] = useState<Category | "all">("all");
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...ideas]
        .filter((i) => filter === "all" || i.category === filter)
        .sort((a, b) => b.votes_count - a.votes_count || b.created_at.localeCompare(a.created_at)),
    [ideas, filter],
  );
  const present = useMemo(() => new Set(ideas.map((i) => i.category)), [ideas]);

  async function vote(id: string) {
    if (voted.has(id)) return;
    setError(null);
    const remember = (set: Set<string>) => writeStored(VOTED_KEY, JSON.stringify([...set]));
    const next = new Set(voted).add(id);
    remember(next);
    setIdeas((list) => list.map((i) => (i.id === id ? { ...i, votes_count: i.votes_count + 1 } : i)));
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ideaId: id }),
      });
      const data = (await res.json()) as { ok: boolean; count?: number };
      if (!res.ok || !data.ok || typeof data.count !== "number") throw new Error();
      setIdeas((list) => list.map((i) => (i.id === id ? { ...i, votes_count: data.count! } : i)));
    } catch {
      const back = new Set(next);
      back.delete(id);
      remember(back);
      setIdeas((list) => list.map((i) => (i.id === id ? { ...i, votes_count: Math.max(0, i.votes_count - 1) } : i)));
      setError(t.ideas.voteError);
    }
  }

  const [leader, ...rest] = sorted;

  return (
    <section id="ideas" aria-labelledby="ideas-title" className="relative z-10 mx-auto max-w-[1400px] px-[var(--gutter)] py-20 sm:py-28">
      <h2 id="ideas-title" className="display [--wdth:115%] text-[min(clamp(34px,7vw,88px),calc((min(100vw,1400px)-2*var(--gutter))/(var(--n)*1.2)))]" style={fitVar(t.ideas.title)}>
        {t.ideas.title}
      </h2>
      <p className="mt-4 max-w-[52ch] text-lg text-paper/85">{IS_STATIC ? t.ideas.staticSub : t.ideas.sub}</p>

      {ideas.length === 0 ? (
        <div className="mt-10 flex flex-col items-start gap-5 rounded-[28px] border-2 border-dashed border-paper/25 p-8">
          <p className="text-xl font-semibold">{t.ideas.empty}</p>
          <SpringLink href={localePath(locale, "/idea")} tone="blue">
            {t.cta.idea}
          </SpringLink>
        </div>
      ) : (
        <>
          <div role="group" aria-label={t.forms.idea.category} className="rail -mx-[var(--gutter)] mt-8 flex gap-2 overflow-x-auto px-[var(--gutter)] pb-1">
            {(["all", ...CATEGORIES] as const)
              .filter((c) => c === "all" || present.has(c))
              .map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={filter === c}
                  onClick={() => setFilter(c)}
                  className={`h-11 shrink-0 rounded-full px-5 text-[15px] font-semibold transition-colors ${
                    filter === c ? "bg-paper text-ink" : "bg-white/8 text-paper ring-1 ring-white/15 hover:bg-white/15"
                  }`}
                >
                  {c === "all" ? t.ideas.all : t.categories[c]}
                </button>
              ))}
          </div>

          <p role="status" aria-live="polite" className="mt-3 min-h-6 text-[15px] font-semibold text-pink">
            {error}
          </p>

          <LayoutGroup>
            <ol className="mt-2 grid gap-3 lg:grid-cols-[1.15fr_1fr] lg:gap-5">
              <AnimatePresence initial={false} mode="popLayout">
                {leader && (
                  <m.li
                    key={leader.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="relative flex min-h-[300px] flex-col overflow-hidden rounded-[28px] bg-blue p-6 sm:p-8 lg:row-span-6"
                  >
                    <div className="halftone pointer-events-none absolute inset-0 opacity-50 [mask-image:linear-gradient(to_bottom_left,black,transparent_55%)]" aria-hidden />
                    <span className="relative inline-flex w-fit items-center gap-2 rounded-full bg-lime px-3.5 py-1.5 text-sm font-bold text-ink">
                      {t.ideas.top}
                    </span>
                    <p className="relative mt-6 text-[clamp(24px,3vw,36px)] font-bold leading-[1.15]">{leader.text}</p>
                    <div className="relative mt-auto flex flex-wrap items-end justify-between gap-4 pt-8">
                      <div>
                        <p className="display text-[clamp(56px,8vw,96px)] leading-none [--wdth:100%]">
                          <m.span key={leader.votes_count} initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-block tabular-nums">
                            {leader.votes_count}
                          </m.span>
                        </p>
                        <p className="mt-1 text-sm font-semibold text-paper/85">
                          {t.categories[leader.category]} · {t.ideas.votes(leader.votes_count)}
                        </p>
                      </div>
                      {!IS_STATIC && <VoteButton voted={voted.has(leader.id)} onVote={() => vote(leader.id)} big label={leader.text} />}
                    </div>
                  </m.li>
                )}
                {rest.map((idea, i) => (
                  <m.li
                    key={idea.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ layout: { type: "spring", stiffness: 260, damping: 28 } }}
                    className="flex items-center gap-4 rounded-[22px] bg-ink-2/80 p-4 ring-1 ring-white/10 backdrop-blur sm:p-5"
                  >
                    <span className="display w-9 shrink-0 text-center text-2xl text-paper/50 [--wdth:100%]" aria-hidden>
                      {i + 2}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[17px] font-semibold leading-snug">{idea.text}</p>
                      <p className="mt-1.5 text-sm text-paper/75">
                        {t.categories[idea.category]} · <span className="tabular-nums">{t.ideas.votes(idea.votes_count)}</span>
                      </p>
                    </div>
                    {!IS_STATIC && <VoteButton voted={voted.has(idea.id)} onVote={() => vote(idea.id)} label={idea.text} />}
                  </m.li>
                ))}
              </AnimatePresence>
            </ol>
          </LayoutGroup>

          <div className="mt-8">
            <SpringLink href={localePath(locale, "/idea")} tone="blue" size="lg">
              {t.cta.idea}
            </SpringLink>
          </div>
        </>
      )}
    </section>
  );
}

function VoteButton({ voted, onVote, big = false, label }: { voted: boolean; onVote: () => void; big?: boolean; label: string }) {
  const t = useDict();
  return (
    <m.button
      {...springTap}
      whileTap={voted ? undefined : { scale: 0.85 }}
      type="button"
      onClick={onVote}
      disabled={voted}
      aria-pressed={voted}
      aria-label={voted ? `${t.ideas.voted}: ${label}` : `${t.ideas.vote}: ${label}`}
      className={`relative flex shrink-0 items-center justify-center gap-2 rounded-full font-bold transition-colors ${
        big ? "h-14 px-6 text-[17px]" : "size-12 sm:h-12 sm:w-auto sm:px-4"
      } ${voted ? "bg-lime text-ink" : big ? "bg-paper text-ink" : "bg-white/10 text-paper ring-1 ring-white/20 hover:bg-white/20"}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <m.span
          key={voted ? "y" : "n"}
          initial={{ scale: 0.3, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          exit={{ scale: 0.3, opacity: 0 }}
          transition={{ type: "spring", stiffness: 600, damping: 15 }}
          className="grid place-items-center"
        >
          {voted ? <CheckFat weight="fill" className="size-5" aria-hidden /> : <ArrowFatUp weight="fill" className="size-5" aria-hidden />}
        </m.span>
      </AnimatePresence>
      <span className={big ? "" : "hidden sm:inline"}>{voted ? t.ideas.voted : t.ideas.vote}</span>
    </m.button>
  );
}
