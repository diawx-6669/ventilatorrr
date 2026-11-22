"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle, PencilSimple, Play, Trash, WarningCircle, YoutubeLogo, InstagramLogo, TiktokLogo } from "@phosphor-icons/react/dist/ssr";
import { episodeSchema } from "@/lib/schemas";
import { parseVideo } from "@/lib/video";
import type { EpisodeRow } from "@/lib/types";
import type { Backend } from "./backend";
import type { Say } from "./admin-app";

type Form = { id?: string; number: string; title: string; guest: string; description: string; video_url: string; published_on: string; is_published: boolean };

const today = () => new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10); // Astana date
const blank = (next: number): Form => ({ number: String(next), title: "", guest: "", description: "", video_url: "", published_on: today(), is_published: true });

const PLATFORM = {
  youtube: { label: "YouTube", Icon: YoutubeLogo },
  instagram: { label: "Instagram", Icon: InstagramLogo },
  tiktok: { label: "TikTok", Icon: TiktokLogo },
} as const;

/** Episodes and their video links. A pasted link is recognised and previewed right away. */
export function EpisodesAdmin({ backend, say }: { backend: Backend; say: Say }) {
  const [list, setList] = useState<EpisodeRow[] | null>(null);
  const [form, setForm] = useState<Form>(blank(1));
  const [busy, setBusy] = useState(false);

  const nextNumber = (rows: EpisodeRow[]) => rows.reduce((m, e) => Math.max(m, e.number), 0) + 1;

  const load = useCallback(
    () =>
      backend.episodes().then(
        (rows) => {
          setList(rows);
          setForm((f) => (f.id || f.title ? f : blank(nextNumber(rows))));
        },
        (e: Error) => say(`Не загрузилось: ${e.message}`, true),
      ),
    [backend, say],
  );
  useEffect(() => {
    const id = requestAnimationFrame(() => load());
    return () => cancelAnimationFrame(id);
  }, [load]);

  const video = useMemo(() => parseVideo(form.video_url.trim() || null), [form.video_url]);
  const linkState = !form.video_url.trim() ? "empty" : video ? "ok" : "bad";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { id, ...raw } = form;
    const parsed = episodeSchema.safeParse(raw);
    if (!parsed.success) {
      say("Проверь поля: номер, название (от 2 символов), ссылка должна начинаться с https://", true);
      return;
    }
    setBusy(true);
    try {
      await backend.saveEpisode(parsed.data, id);
      say(id ? "Выпуск обновлён, на сайте уже видно" : "Выпуск добавлен, на сайте уже видно");
      setForm(blank(0));
      await load();
    } catch (err) {
      say(`Не сохранилось: ${(err as Error).message}`, true);
    } finally {
      setBusy(false);
    }
  }

  const input = "h-12 w-full rounded-xl bg-ink px-3 outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-orange";
  const set = (k: keyof Form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
      <form onSubmit={save} className="grid gap-3 self-start rounded-3xl bg-ink-2 p-5 ring-1 ring-white/10 lg:sticky lg:top-24">
        <h2 className="text-lg font-bold">{form.id ? "Редактировать выпуск" : "Новый выпуск"}</h2>

        <label className="text-sm font-semibold">
          Ссылка на видео
          <input
            type="url"
            inputMode="url"
            placeholder="https://youtu.be/… · instagram.com/reel/… · tiktok.com/@…/video/…"
            value={form.video_url}
            onChange={(e) => set("video_url", e.target.value)}
            className={`${input} mt-1 ${linkState === "bad" ? "ring-2 ring-pink" : ""}`}
          />
        </label>
        {linkState !== "empty" && (
          <div className="flex items-center gap-3 rounded-2xl bg-ink p-3 ring-1 ring-white/10">
            {video?.thumb ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={video.thumb} alt="" onError={(e) => (e.currentTarget.style.visibility = "hidden")} className="h-14 w-24 shrink-0 rounded-lg bg-white/5 object-cover" />
            ) : (
              <span className="grid h-14 w-24 shrink-0 place-items-center rounded-lg bg-white/5">
                {video ? (() => { const P = PLATFORM[video.platform]; return <P.Icon className="size-7" aria-hidden />; })() : <WarningCircle className="size-7 text-pink" aria-hidden />}
              </span>
            )}
            <p className="text-sm">
              {video ? (
                <>
                  <span className="flex items-center gap-1 font-bold text-lime">
                    <CheckCircle weight="fill" className="size-4" aria-hidden /> {PLATFORM[video.platform].label}
                    {video.platform === "youtube" && video.vertical ? " Shorts" : ""}
                  </span>
                  <span className="text-paper/70">Видео встроится в карточку выпуска на сайте.</span>
                </>
              ) : (
                <span className="text-[#ff8fbd]">Не узнаю ссылку. Нужна ссылка на конкретное видео: YouTube, Instagram (пост или reels) или TikTok.</span>
              )}
            </p>
          </div>
        )}

        <div className="grid grid-cols-[90px_1fr] gap-3">
          <label className="text-sm font-semibold">
            Номер
            <input required inputMode="numeric" value={form.number} onChange={(e) => set("number", e.target.value)} className={`${input} mt-1`} />
          </label>
          <label className="text-sm font-semibold">
            Название
            <input required minLength={2} maxLength={140} value={form.title} onChange={(e) => set("title", e.target.value)} className={`${input} mt-1`} />
          </label>
        </div>
        <label className="text-sm font-semibold">
          Гость
          <input maxLength={80} value={form.guest} onChange={(e) => set("guest", e.target.value)} className={`${input} mt-1`} />
        </label>
        <label className="text-sm font-semibold">
          Описание
          <textarea rows={3} maxLength={500} value={form.description} onChange={(e) => set("description", e.target.value)} className={`${input} mt-1 h-auto py-2`} />
        </label>
        <label className="text-sm font-semibold">
          Дата выхода
          <input type="date" value={form.published_on} onChange={(e) => set("published_on", e.target.value)} className={`${input} mt-1 [color-scheme:dark]`} />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" checked={form.is_published} onChange={(e) => set("is_published", e.target.checked)} className="size-5 accent-orange" />
          Показывать на сайте
        </label>
        <div className="flex gap-2">
          <button disabled={busy || linkState === "bad"} className="h-12 flex-1 rounded-full bg-orange font-bold text-ink disabled:opacity-60">
            {busy ? "Сохраняем…" : form.id ? "Сохранить" : "Добавить выпуск"}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(blank(nextNumber(list ?? [])))} className="h-12 rounded-full px-5 font-semibold ring-1 ring-white/20">
              Отмена
            </button>
          )}
        </div>
      </form>

      <div className="grid content-start gap-3">
        {list === null ? (
          <div className="h-32 animate-pulse rounded-3xl bg-white/5" />
        ) : list.length === 0 ? (
          <p className="rounded-3xl border-2 border-dashed border-white/15 p-10 text-center text-paper/75">Выпусков пока нет. Вставь ссылку на видео слева.</p>
        ) : (
          list.map((ep) => {
            const v = parseVideo(ep.video_url);
            return (
              <article key={ep.id} className={`flex items-start gap-4 rounded-3xl bg-ink-2 p-4 ring-1 sm:p-5 ${form.id === ep.id ? "ring-orange" : "ring-white/10"}`}>
                <div className="relative grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-orange/15">
                  {v?.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.thumb} alt="" onError={(e) => (e.currentTarget.style.display = "none")} className="absolute inset-0 size-full object-cover" />
                  ) : (
                    <span className="display text-3xl text-orange [--wdth:90%]">{String(ep.number).padStart(2, "0")}</span>
                  )}
                  {v && <Play weight="fill" className="relative size-6 drop-shadow" aria-hidden />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold">
                    <span className="text-orange">#{ep.number}</span> {ep.title}
                  </h3>
                  <p className="mt-1 text-sm text-paper/75">
                    {ep.guest ?? "без гостя"} · {v ? PLATFORM[v.platform].label : ep.video_url ? "ссылка не распознана" : "без видео"} ·{" "}
                    <span className={ep.is_published ? "text-lime" : ""}>{ep.is_published ? "на сайте" : "скрыт"}</span>
                  </p>
                  {ep.video_url && (
                    <a href={ep.video_url} target="_blank" rel="noopener" className="mt-1 block truncate text-sm text-paper/60 underline-offset-4 hover:text-paper hover:underline">
                      {ep.video_url}
                    </a>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Редактировать: ${ep.title}`}
                  onClick={() => {
                    setForm({
                      id: ep.id,
                      number: String(ep.number),
                      title: ep.title,
                      guest: ep.guest ?? "",
                      description: ep.description ?? "",
                      video_url: ep.video_url ?? "",
                      published_on: ep.published_on ?? "",
                      is_published: ep.is_published,
                    });
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="grid size-10 shrink-0 place-items-center rounded-full ring-1 ring-white/20 hover:bg-white/10"
                >
                  <PencilSimple className="size-5" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-label={`Удалить: ${ep.title}`}
                  onClick={async () => {
                    if (!confirm(`Удалить «${ep.title}»?`)) return;
                    try {
                      await backend.deleteEpisode(ep.id);
                      say("Выпуск удалён");
                      await load();
                    } catch (err) {
                      say(`Не удалилось: ${(err as Error).message}`, true);
                    }
                  }}
                  className="grid size-10 shrink-0 place-items-center rounded-full ring-1 ring-white/20 hover:bg-pink hover:text-ink"
                >
                  <Trash className="size-5" aria-hidden />
                </button>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
