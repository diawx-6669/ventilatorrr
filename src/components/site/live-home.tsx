"use client";
import { useEffect, useState } from "react";
import { DIRECT } from "@/lib/deploy";
import { useDict } from "@/components/providers";
import type { PublicEpisode, PublicIdea, PublicNews, PublicStats } from "@/lib/types";
import { Ticker } from "./ticker";
import { Doors } from "./doors";
import { Episodes } from "./episodes";
import { Ideas } from "./ideas";

type HomeData = { news: PublicNews[]; ideas: PublicIdea[]; episodes: PublicEpisode[]; stats: PublicStats | null };

/**
 * The home page blocks that show data. The HTML is built with whatever the data was at build
 * time; on the static site the browser then pulls the current state from Supabase, so anything
 * the team publishes in the admin panel shows up on the next visit without a rebuild.
 */
export function LiveHome({ initial, hosts }: { initial: HomeData; hosts: React.ReactNode }) {
  const t = useDict();
  const [data, setData] = useState(initial);

  useEffect(() => {
    if (!DIRECT) return;
    let alive = true;
    import("@/lib/direct")
      .then(({ fetchHome }) => fetchHome())
      .then((fresh) => {
        if (!alive) return;
        // Keep object identity when nothing changed, so lists don't re-animate.
        setData((old) => ({
          news: same(old.news, fresh.news) ? old.news : fresh.news,
          ideas: same(old.ideas, fresh.ideas) ? old.ideas : fresh.ideas,
          episodes: same(old.episodes, fresh.episodes) ? old.episodes : fresh.episodes,
          stats: same(old.stats, fresh.stats) ? old.stats : fresh.stats,
        }));
      })
      .catch((e) => console.error("live refresh", e));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <>
      <Ticker news={data.news} t={t} />
      <Doors stats={data.stats} />
      {hosts}
      <Episodes episodes={data.episodes} />
      <Ideas ideas={data.ideas} />
    </>
  );
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
