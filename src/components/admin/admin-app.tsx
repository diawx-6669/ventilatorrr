"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowSquareOut, DownloadSimple, SignOut, MagnifyingGlass, Eye, EyeSlash, Trash, PencilSimple, Image as ImageIcon } from "@phosphor-icons/react/dist/ssr";
import { site } from "@/config/site";
import { FanMark } from "@/components/site/fan-mark";
import type { AdminRow, EpisodeRow, Kind, Status } from "@/lib/types";
import { STATUSES } from "@/lib/types";
import { getDictionary } from "@/i18n/dictionary";

const ru = getDictionary("ru");
type Tab = Kind | "episodes";

const TABS: { key: Tab; label: string; tone: string }[] = [
  { key: "participate", label: "Хотят в выпуск", tone: "bg-lime text-ink" },
  { key: "ideas", label: "Идеи", tone: "bg-blue text-paper" },
  { key: "news", label: "Новости", tone: "bg-pink text-ink" },
  { key: "episodes", label: "Выпуски", tone: "bg-orange text-ink" },
];

const STATUS_LABEL: Record<Status, string> = { new: "Новая", in_progress: "В работе", approved: "Одобрена", rejected: "Отклонена" };
const STATUS_TONE: Record<Status, string> = {
  new: "bg-orange text-ink",
  in_progress: "bg-blue text-paper",
  approved: "bg-lime text-ink",
  rejected: "bg-white/15 text-paper",
};

const fmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Almaty" });

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "content-type": "application/json", ...init?.headers }, cache: "no-store" });
  if (res.status === 401) {
    location.reload();
    throw new Error("unauthorized");
  }
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error ?? "Ошибка сервера");
  return data as T;
}

export function AdminApp({ email, mode }: { email: string; mode: "supabase" | "demo" }) {
  const [tab, setTab] = useState<Tab>("participate");
  const [rows, setRows] = useState<Record<Kind, AdminRow[] | null>>({ participate: null, ideas: null, news: null });
  const [status, setStatus] = useState<Status | "all">("all");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);

  const say = useCallback((text: string, error = false) => {
    setToast({ text, error });
    setTimeout(() => setToast(null), 3200);
  }, []);

  useEffect(() => {
    // Load every tab once so the "new" counters are right from the start.
    let alive = true;
    for (const kind of ["participate", "ideas", "news"] as const) {
      api<{ rows: AdminRow[] }>(`/api/admin/rows?kind=${kind}`).then(
        (data) => alive && setRows((r) => ({ ...r, [kind]: data.rows })),
        (e: Error) => alive && say(`Не загрузилось: ${e.message}`, true),
      );
    }
    return () => {
      alive = false;
    };
  }, [say]);

  async function patch(kind: Kind, id: string, changes: Record<string, unknown>, done?: string) {
    const before = rows[kind];
    setRows((r) => ({
      ...r,
      [kind]: r[kind]?.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...changes } as AdminRow;
        if (changes.published === true) (next as { status: Status }).status = "approved";
        if (changes.status && changes.status !== "approved" && "published" in next) (next as { published: boolean }).published = false;
        return next;
      }) ?? null,
    }));
    try {
      await api("/api/admin/rows", { method: "PATCH", body: JSON.stringify({ kind, id, ...changes }) });
      if (done) say(done);
    } catch (e) {
      setRows((r) => ({ ...r, [kind]: before }));
      say(`Не сохранилось: ${(e as Error).message}`, true);
    }
  }

  const newCount = (k: Kind) => rows[k]?.filter((r) => r.status === "new").length ?? 0;

  const visible = useMemo(() => {
    if (tab === "episodes") return [];
    const q = query.trim().toLowerCase();
    return (rows[tab] ?? []).filter((r) => (status === "all" || r.status === status) && (!q || JSON.stringify(r).toLowerCase().includes(q)));
  }, [rows, tab, status, query]);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <FanMark className="size-9" />
          <div className="min-w-0">
            <p className="display truncate text-[15px] [--wdth:140%]">{site.name}</p>
            <p className="truncate text-xs text-paper/70">
              {email} · {mode === "demo" ? "демо-режим" : "Supabase"}
            </p>
          </div>
          <a href="/" target="_blank" className="ml-auto hidden h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ring-1 ring-white/20 hover:bg-white/10 sm:flex">
            Сайт <ArrowSquareOut className="size-4" aria-hidden />
          </a>
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/admin/logout", { method: "POST" });
              location.reload();
            }}
            className="ml-auto flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ring-1 ring-white/20 hover:bg-white/10 sm:ml-0"
          >
            <SignOut className="size-4" aria-hidden /> Выйти
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6">
        <div role="tablist" aria-label="Разделы" className="rail -mx-4 flex gap-2 overflow-x-auto px-4 pb-2">
          {TABS.map((t) => {
            const active = tab === t.key;
            const n = t.key === "episodes" ? 0 : newCount(t.key);
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(t.key);
                  setStatus("all");
                }}
                className={`flex h-12 shrink-0 items-center gap-2 rounded-full px-5 font-bold transition-colors ${active ? t.tone : "bg-white/8 text-paper ring-1 ring-white/15 hover:bg-white/15"}`}
              >
                {t.label}
                {n > 0 && <span className={`grid min-w-6 place-items-center rounded-full px-1.5 text-xs ${active ? "bg-ink text-paper" : "bg-orange text-ink"}`}>{n}</span>}
              </button>
            );
          })}
        </div>

        {tab === "episodes" ? (
          <EpisodesAdmin say={say} />
        ) : (
          <section role="tabpanel" aria-label={TABS.find((t) => t.key === tab)?.label}>
            <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
              <div role="group" aria-label="Статус" className="rail -mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:px-0">
                {(["all", ...STATUSES] as const).map((s) => {
                  const count = s === "all" ? (rows[tab]?.length ?? 0) : (rows[tab]?.filter((r) => r.status === s).length ?? 0);
                  return (
                    <button
                      key={s}
                      aria-pressed={status === s}
                      onClick={() => setStatus(s)}
                      className={`h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors ${status === s ? "bg-paper text-ink" : "bg-white/8 ring-1 ring-white/15 hover:bg-white/15"}`}
                    >
                      {s === "all" ? "Все" : STATUS_LABEL[s]} <span className="tabular-nums opacity-70">{count}</span>
                    </button>
                  );
                })}
              </div>
              <label className="relative lg:ml-auto lg:w-72">
                <span className="sr-only">Поиск</span>
                <MagnifyingGlass className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-paper/60" aria-hidden />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Поиск"
                  className="h-11 w-full rounded-full bg-ink-2 pl-11 pr-4 outline-none ring-1 ring-white/15 placeholder:text-paper/55 focus:ring-2 focus:ring-lime"
                />
              </label>
              <a
                href={`/api/admin/export?kind=${tab}&status=${status}`}
                className="flex h-11 items-center justify-center gap-2 rounded-full bg-paper px-5 text-sm font-bold text-ink hover:bg-lime"
              >
                <DownloadSimple weight="bold" className="size-5" aria-hidden /> CSV
              </a>
            </div>

            <div className="mt-5 grid gap-3">
              {rows[tab] === null ? (
                Array.from({ length: 3 }, (_, i) => <div key={i} className="h-40 animate-pulse rounded-3xl bg-white/5" />)
              ) : visible.length === 0 ? (
                <p className="rounded-3xl border-2 border-dashed border-white/15 p-10 text-center text-paper/75">
                  {rows[tab]!.length === 0 ? "Заявок пока нет. Поделись ссылкой на сайт или повесь QR-плакат." : "Ничего не найдено по этому фильтру."}
                </p>
              ) : (
                visible.map((row) => <RowCard key={row.id} row={row} onPatch={patch} />)
              )}
            </div>
          </section>
        )}
      </main>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
        {toast && (
          <p className={`pointer-events-auto rounded-full px-5 py-3 text-sm font-bold shadow-2xl ${toast.error ? "bg-pink text-ink" : "bg-lime text-ink"}`}>{toast.text}</p>
        )}
      </div>
    </div>
  );
}

function StatusPicker({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  return (
    <div role="radiogroup" aria-label="Статус" className="flex flex-wrap gap-1.5">
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={value === s}
          onClick={() => value !== s && onChange(s)}
          className={`h-9 rounded-full px-3.5 text-[13px] font-bold transition-colors ${value === s ? STATUS_TONE[s] : "bg-white/6 text-paper/85 ring-1 ring-white/15 hover:bg-white/12"}`}
        >
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  );
}

function NoteField({ value, onSave }: { value: string | null; onSave: (v: string | null) => void }) {
  const [draft, setDraft] = useState(value ?? "");
  return (
    <label className="block">
      <span className="text-xs font-semibold text-paper/70">Заметка команды (не публикуется)</span>
      <textarea
        rows={1}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== (value ?? "") && onSave(draft.trim() || null)}
        className="mt-1 w-full resize-y rounded-xl bg-ink px-3 py-2 text-sm outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-lime"
      />
    </label>
  );
}

function RowCard({ row, onPatch }: { row: AdminRow; onPatch: (kind: Kind, id: string, changes: Record<string, unknown>, done?: string) => void }) {
  const p = (changes: Record<string, unknown>, done?: string) => onPatch(row.kind, row.id, changes, done);
  const head = (
    <div className="flex flex-wrap items-center gap-2 text-[13px] text-paper/70">
      <span className={`rounded-full px-2.5 py-0.5 font-bold ${STATUS_TONE[row.status]}`}>{STATUS_LABEL[row.status]}</span>
      <time dateTime={row.created_at}>{fmt.format(new Date(row.created_at))}</time>
      {"published" in row && row.published && <span className="rounded-full bg-lime/15 px-2.5 py-0.5 font-bold text-lime ring-1 ring-lime/40">на сайте</span>}
    </div>
  );

  if (row.kind === "participate") {
    const link = row.contact_type === "telegram" ? `https://t.me/${row.contact}` : `https://instagram.com/${row.contact}`;
    return (
      <article className="rounded-3xl bg-ink-2 p-5 ring-1 ring-white/10">
        {head}
        <h3 className="mt-3 text-xl font-bold">
          {row.name}, {row.grade} <span className="font-semibold text-lime">· {ru.roles[row.role]}</span>
        </h3>
        <p className="mt-2 whitespace-pre-line text-[16px] leading-relaxed text-paper/90">{row.pitch}</p>
        <a href={link} target="_blank" rel="noopener" className="mt-3 inline-flex items-center gap-1.5 font-semibold text-lime underline-offset-4 hover:underline">
          {row.contact_type === "telegram" ? "Telegram" : "Instagram"}: @{row.contact} <ArrowSquareOut className="size-4" aria-hidden />
        </a>
        <div className="mt-4 grid gap-3 border-t border-white/10 pt-4 md:grid-cols-[auto_1fr] md:items-end">
          <StatusPicker value={row.status} onChange={(s) => p({ status: s }, `Статус: ${STATUS_LABEL[s]}`)} />
          <NoteField value={row.admin_note} onSave={(v) => p({ admin_note: v }, "Заметка сохранена")} />
        </div>
      </article>
    );
  }

  if (row.kind === "ideas") {
    return (
      <PublishCard
        head={head}
        body={
          <>
            <p className="text-[13px] font-semibold text-[#8da0ff]">
              {ru.categories[row.category]} · {row.votes_count} голосов{row.name ? ` · от: ${row.name}` : ""}
            </p>
            <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed">{row.idea}</p>
          </>
        }
        row={row}
        publicLabel="Текст на сайте"
        publicField="public_text"
        publicValue={row.public_text ?? row.idea}
        max={500}
        onPatch={p}
      />
    );
  }

  return (
    <PublishCard
      head={head}
      body={
        <>
          <p className="text-[13px] font-semibold text-pink">
            {row.when_preset === "week" ? "на этой неделе" : row.happened_on ?? "дата не указана"} · {row.is_anonymous ? "анонимно" : `от: ${row.name}`}
          </p>
          <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed">{row.what}</p>
          {row.source && <p className="mt-2 text-sm text-paper/80">Источник: {row.source}</p>}
          {row.photo_url && (
            <a href={row.photo_url} target="_blank" rel="noopener" className="mt-3 inline-flex items-center gap-2 font-semibold text-lime">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={row.photo_url} alt="Фото к новости" className="size-20 rounded-xl object-cover ring-1 ring-white/20" />
              <span className="inline-flex items-center gap-1">
                <ImageIcon className="size-4" aria-hidden /> Открыть фото
              </span>
            </a>
          )}
        </>
      }
      row={row}
      publicLabel="Заголовок для бегущей строки"
      publicField="headline"
      publicValue={row.headline ?? suggestHeadline(row.what)}
      max={140}
      onPatch={p}
    />
  );
}

function suggestHeadline(text: string) {
  const first = text.split(/(?<=[.!?])\s|\n/)[0] ?? text;
  return first.length > 120 ? `${first.slice(0, 117).trimEnd()}…` : first;
}

function PublishCard({
  head,
  body,
  row,
  publicLabel,
  publicField,
  publicValue,
  max,
  onPatch,
}: {
  head: React.ReactNode;
  body: React.ReactNode;
  row: Extract<AdminRow, { published: boolean }>;
  publicLabel: string;
  publicField: "public_text" | "headline";
  publicValue: string;
  max: number;
  onPatch: (changes: Record<string, unknown>, done?: string) => void;
}) {
  const [text, setText] = useState(publicValue);
  const tooLong = text.length > max;
  return (
    <article className={`rounded-3xl bg-ink-2 p-5 ring-1 ${row.published ? "ring-lime/50" : "ring-white/10"}`}>
      {head}
      <div className="mt-3">{body}</div>
      <div className="mt-4 grid gap-3 border-t border-white/10 pt-4">
        <label className="block">
          <span className="flex justify-between text-xs font-semibold text-paper/70">
            {publicLabel}
            <span className={tooLong ? "text-pink" : ""}>
              {text.length}/{max}
            </span>
          </span>
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => row.published && text.trim() && !tooLong && text !== publicValue && onPatch({ [publicField]: text.trim() }, "Текст на сайте обновлён")}
            className="mt-1 w-full resize-y rounded-xl bg-ink px-3 py-2 text-[15px] outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-lime"
          />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          {row.published ? (
            <button
              type="button"
              onClick={() => onPatch({ published: false }, "Снято с сайта")}
              className="flex h-11 items-center gap-2 rounded-full bg-white/10 px-5 font-bold ring-1 ring-white/20 hover:bg-white/20"
            >
              <EyeSlash weight="bold" className="size-5" aria-hidden /> Снять с сайта
            </button>
          ) : (
            <button
              type="button"
              disabled={!text.trim() || tooLong}
              onClick={() => onPatch({ published: true, [publicField]: text.trim() }, "Опубликовано на сайте")}
              className="flex h-11 items-center gap-2 rounded-full bg-lime px-5 font-bold text-ink disabled:opacity-50"
            >
              <Eye weight="bold" className="size-5" aria-hidden /> Опубликовать на сайт
            </button>
          )}
          <StatusPicker value={row.status} onChange={(s) => onPatch({ status: s }, `Статус: ${STATUS_LABEL[s]}`)} />
        </div>
        <NoteField value={row.admin_note} onSave={(v) => onPatch({ admin_note: v }, "Заметка сохранена")} />
      </div>
    </article>
  );
}

const emptyEpisode = { number: "", title: "", guest: "", description: "", video_url: "", published_on: "", is_published: true };

function EpisodesAdmin({ say }: { say: (t: string, e?: boolean) => void }) {
  const [list, setList] = useState<EpisodeRow[] | null>(null);
  const [form, setForm] = useState<typeof emptyEpisode & { id?: string }>(emptyEpisode);
  const [busy, setBusy] = useState(false);

  const load = useCallback(
    () =>
      api<{ rows: EpisodeRow[] }>("/api/admin/episodes").then(
        (data) => setList(data.rows),
        (e: Error) => say(`Не загрузилось: ${e.message}`, true),
      ),
    [say],
  );
  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/admin/episodes", { method: "POST", body: JSON.stringify(form) });
      say(form.id ? "Выпуск обновлён" : "Выпуск добавлен");
      setForm(emptyEpisode);
      await load();
    } catch {
      say("Проверь поля: номер, название, ссылка должна начинаться с https://", true);
    } finally {
      setBusy(false);
    }
  }

  const input = "h-12 w-full rounded-xl bg-ink px-3 outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-orange";
  const set = (k: keyof typeof emptyEpisode, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[400px_1fr]">
      <form onSubmit={save} className="grid gap-3 self-start rounded-3xl bg-ink-2 p-5 ring-1 ring-white/10">
        <h2 className="text-lg font-bold">{form.id ? "Редактировать выпуск" : "Новый выпуск"}</h2>
        <div className="grid grid-cols-[90px_1fr] gap-3">
          <label className="text-sm font-semibold">
            Номер
            <input required inputMode="numeric" value={form.number} onChange={(e) => set("number", e.target.value)} className={`${input} mt-1`} />
          </label>
          <label className="text-sm font-semibold">
            Название
            <input required value={form.title} onChange={(e) => set("title", e.target.value)} className={`${input} mt-1`} />
          </label>
        </div>
        <label className="text-sm font-semibold">
          Гость
          <input value={form.guest} onChange={(e) => set("guest", e.target.value)} className={`${input} mt-1`} />
        </label>
        <label className="text-sm font-semibold">
          Ссылка на видео (YouTube, Instagram, TikTok)
          <input type="url" placeholder="https://" value={form.video_url} onChange={(e) => set("video_url", e.target.value)} className={`${input} mt-1`} />
        </label>
        <label className="text-sm font-semibold">
          Описание
          <textarea rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} className={`${input} mt-1 h-auto py-2`} />
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
          <button disabled={busy} className="h-12 flex-1 rounded-full bg-orange font-bold text-ink disabled:opacity-60">
            {form.id ? "Сохранить" : "Добавить выпуск"}
          </button>
          {form.id && (
            <button type="button" onClick={() => setForm(emptyEpisode)} className="h-12 rounded-full px-5 font-semibold ring-1 ring-white/20">
              Отмена
            </button>
          )}
        </div>
      </form>

      <div className="grid content-start gap-3">
        {list === null ? (
          <div className="h-32 animate-pulse rounded-3xl bg-white/5" />
        ) : list.length === 0 ? (
          <p className="rounded-3xl border-2 border-dashed border-white/15 p-10 text-center text-paper/75">Выпусков пока нет. Добавь первый слева.</p>
        ) : (
          list.map((ep) => (
            <article key={ep.id} className="flex items-start gap-4 rounded-3xl bg-ink-2 p-5 ring-1 ring-white/10">
              <span className="display text-3xl text-orange [--wdth:90%]">{String(ep.number).padStart(2, "0")}</span>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold">{ep.title}</h3>
                <p className="mt-1 truncate text-sm text-paper/75">
                  {ep.guest ?? "без гостя"} · {ep.video_url ? "есть видео" : "без видео"} · {ep.is_published ? "на сайте" : "скрыт"}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Редактировать: ${ep.title}`}
                onClick={() =>
                  setForm({
                    id: ep.id,
                    number: String(ep.number),
                    title: ep.title,
                    guest: ep.guest ?? "",
                    description: ep.description ?? "",
                    video_url: ep.video_url ?? "",
                    published_on: ep.published_on ?? "",
                    is_published: ep.is_published,
                  })
                }
                className="grid size-10 place-items-center rounded-full ring-1 ring-white/20 hover:bg-white/10"
              >
                <PencilSimple className="size-5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label={`Удалить: ${ep.title}`}
                onClick={async () => {
                  if (!confirm(`Удалить «${ep.title}»?`)) return;
                  try {
                    await api(`/api/admin/episodes?id=${ep.id}`, { method: "DELETE" });
                    say("Выпуск удалён");
                    await load();
                  } catch {
                    say("Не удалилось", true);
                  }
                }}
                className="grid size-10 place-items-center rounded-full ring-1 ring-white/20 hover:bg-pink hover:text-ink"
              >
                <Trash className="size-5" aria-hidden />
              </button>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
