"use client";
import { useCallback, useEffect, useState } from "react";
import { Copy, Crown, EnvelopeSimple, Key, PaperPlaneTilt, Trash, UserPlus, X } from "@phosphor-icons/react/dist/ssr";
import { site } from "@/config/site";
import { withBase } from "@/lib/deploy";
import type { Backend, Invite, Me, TeamMember } from "./backend";
import type { Say } from "./admin-app";

const day = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "Asia/Almaty" });

function inviteLink(inv: Invite) {
  const url = new URL(withBase("/admin/"), location.origin);
  url.searchParams.set("email", inv.email);
  url.searchParams.set("invite", inv.code);
  return url.toString();
}

function inviteText(inv: Invite) {
  return [
    `Тебя добавили в админку ${site.name}.`,
    `Открой ссылку и придумай пароль: ${inviteLink(inv)}`,
    `Код приглашения: ${inv.code} (действует до ${day.format(new Date(inv.expires_at))}).`,
  ].join("\n");
}

/**
 * Who has access. The owner adds people by email; each gets a one-time invite link
 * (nothing is emailed automatically: send it in Telegram, Instagram or by mail).
 */
export function TeamAdmin({ me, backend, say }: { me: Me; backend: Backend; say: Say }) {
  const team = backend.team;
  const [list, setList] = useState<TeamMember[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<Invite | null>(null);

  const load = useCallback(() => {
    if (!team) return;
    team.list().then(setList, (e: Error) => say(`Не загрузилось: ${e.message}`, true));
  }, [team, say]);
  useEffect(() => {
    const id = requestAnimationFrame(() => load());
    return () => cancelAnimationFrame(id);
  }, [load]);

  if (!team) {
    return (
      <p className="mt-6 rounded-3xl border-2 border-dashed border-white/15 p-10 text-center text-paper/75">
        Управление командой работает с подключённым Supabase. В демо-режиме вход один, по паролю.
      </p>
    );
  }

  async function add(target: string, again = false) {
    setBusy(true);
    try {
      const inv = await team!.invite(target);
      setInvite(inv);
      setEmail("");
      say(again ? "Новая ссылка готова, старая больше не работает" : "Добавлен. Отправь ему ссылку");
      load();
    } catch (e) {
      say((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
      <div className="grid content-start gap-6">
        {me.owner ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              add(email);
            }}
            className="grid gap-3 rounded-3xl bg-ink-2 p-5 ring-1 ring-white/10"
          >
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <UserPlus weight="bold" className="size-5 text-lime" aria-hidden /> Добавить в команду
            </h2>
            <p className="text-sm text-paper/75">Введи email человека. Появится ссылка-приглашение: отправь её ему, он придумает пароль и сразу войдёт.</p>
            <input
              type="email"
              required
              placeholder="name@nisa.edu.kz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-xl bg-ink px-3 outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-lime"
            />
            <button disabled={busy} className="h-12 rounded-full bg-lime font-bold text-ink disabled:opacity-60">
              {busy ? "Секунду…" : "Добавить и получить ссылку"}
            </button>
          </form>
        ) : (
          <p className="rounded-3xl bg-ink-2 p-5 text-sm text-paper/80 ring-1 ring-white/10">Добавлять и удалять людей может владелец. Здесь можно сменить свой пароль.</p>
        )}

        {invite && <InviteCard invite={invite} onClose={() => setInvite(null)} say={say} />}

        <PasswordForm backend={backend} say={say} />
      </div>

      <div className="grid content-start gap-3">
        {list === null ? (
          <div className="h-32 animate-pulse rounded-3xl bg-white/5" />
        ) : (
          list.map((m) => {
            const isMe = m.email === me.email;
            return (
              <article key={m.email} className="flex flex-wrap items-center gap-3 rounded-3xl bg-ink-2 p-4 ring-1 ring-white/10 sm:p-5">
                <span className={`grid size-11 shrink-0 place-items-center rounded-full font-bold ${m.is_owner ? "bg-lime text-ink" : "bg-white/10"}`}>
                  {m.is_owner ? <Crown weight="fill" className="size-5" aria-hidden /> : m.email[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">
                    {m.email} {isMe && <span className="font-semibold text-paper/60">(это ты)</span>}
                  </p>
                  <p className="mt-0.5 text-sm text-paper/70">
                    {m.is_owner ? "владелец · " : ""}
                    {m.active ? (
                      <span className="text-lime">вход открыт</span>
                    ) : m.invite_pending ? (
                      <span className="text-orange">ждём, пока примет приглашение (до {day.format(new Date(m.invite_expires_at!))})</span>
                    ) : (
                      <span className="text-pink">приглашение истекло</span>
                    )}
                    {m.added_by && m.added_by !== "setup" ? ` · добавил(а) ${m.added_by}` : ""}
                  </p>
                </div>
                {me.owner && !isMe && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        if (m.active && !confirm(`Сбросить пароль ${m.email} и выдать новую ссылку? Старый пароль перестанет работать.`)) return;
                        add(m.email, true);
                      }}
                      className="flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold ring-1 ring-white/20 hover:bg-white/10"
                    >
                      <Key className="size-4" aria-hidden /> {m.active ? "Сбросить пароль" : "Новая ссылка"}
                    </button>
                    {!m.is_owner && (
                      <button
                        type="button"
                        aria-label={`Удалить ${m.email}`}
                        onClick={async () => {
                          if (!confirm(`Убрать ${m.email} из команды? Доступ закроется сразу.`)) return;
                          try {
                            await team.remove(m.email);
                            say("Доступ закрыт");
                            load();
                          } catch (e) {
                            say((e as Error).message, true);
                          }
                        }}
                        className="grid size-10 place-items-center rounded-full ring-1 ring-white/20 hover:bg-pink hover:text-ink"
                      >
                        <Trash className="size-4" aria-hidden />
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function InviteCard({ invite, onClose, say }: { invite: Invite; onClose: () => void; say: Say }) {
  const text = inviteText(invite);
  const link = inviteLink(invite);
  const copy = async (value: string, done: string) => {
    try {
      await navigator.clipboard.writeText(value);
      say(done);
    } catch {
      say("Не получилось скопировать. Выдели текст вручную.", true);
    }
  };
  return (
    <div className="relative grid gap-3 rounded-3xl bg-lime p-5 text-ink">
      <button type="button" onClick={onClose} aria-label="Закрыть" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full hover:bg-ink/10">
        <X weight="bold" className="size-5" aria-hidden />
      </button>
      <h3 className="pr-10 text-lg font-bold">Приглашение для {invite.email}</h3>
      <p className="text-sm font-medium">Ссылка одноразовая и действует 7 дней. Отправь её лично, не в общий чат.</p>
      <p className="rounded-2xl bg-ink px-4 py-3 text-center font-mono text-2xl font-bold tracking-[0.25em] text-lime">{invite.code}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={() => copy(text, "Сообщение скопировано")} className="flex h-11 items-center justify-center gap-2 rounded-full bg-ink font-bold text-paper">
          <Copy weight="bold" className="size-5" aria-hidden /> Скопировать
        </button>
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Тебя добавили в админку ${site.name}. Код: ${invite.code}`)}`}
          target="_blank"
          rel="noopener"
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-ink font-bold text-paper"
        >
          <PaperPlaneTilt weight="bold" className="size-5" aria-hidden /> Telegram
        </a>
        <a
          href={`mailto:${invite.email}?subject=${encodeURIComponent(`Админка ${site.name}`)}&body=${encodeURIComponent(text)}`}
          className="flex h-11 items-center justify-center gap-2 rounded-full bg-ink/10 font-bold ring-1 ring-ink/30 sm:col-span-2"
        >
          <EnvelopeSimple weight="bold" className="size-5" aria-hidden /> Отправить письмом
        </a>
      </div>
    </div>
  );
}

function PasswordForm({ backend, say }: { backend: Backend; say: Say }) {
  const [open, setOpen] = useState(false);
  const [oldPw, setOld] = useState("");
  const [newPw, setNew] = useState("");
  const [busy, setBusy] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex h-12 items-center justify-center gap-2 rounded-full font-semibold ring-1 ring-white/20 hover:bg-white/10">
        <Key className="size-5" aria-hidden /> Сменить мой пароль
      </button>
    );
  }
  const input = "h-12 w-full rounded-xl bg-ink px-3 outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-lime";
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await backend.team!.changePassword(oldPw, newPw);
          say("Пароль изменён. Другие устройства вышли из аккаунта");
          setOpen(false);
          setOld("");
          setNew("");
        } catch (err) {
          say((err as Error).message, true);
        } finally {
          setBusy(false);
        }
      }}
      className="grid gap-3 rounded-3xl bg-ink-2 p-5 ring-1 ring-white/10"
    >
      <h2 className="text-lg font-bold">Сменить пароль</h2>
      <label className="text-sm font-semibold">
        Текущий пароль
        <input type="password" autoComplete="current-password" required value={oldPw} onChange={(e) => setOld(e.target.value)} className={`${input} mt-1`} />
      </label>
      <label className="text-sm font-semibold">
        Новый пароль (минимум 8 символов)
        <input type="password" autoComplete="new-password" required minLength={8} value={newPw} onChange={(e) => setNew(e.target.value)} className={`${input} mt-1`} />
      </label>
      <div className="flex gap-2">
        <button disabled={busy} className="h-12 flex-1 rounded-full bg-lime font-bold text-ink disabled:opacity-60">
          Сохранить
        </button>
        <button type="button" onClick={() => setOpen(false)} className="h-12 rounded-full px-5 font-semibold ring-1 ring-white/20">
          Отмена
        </button>
      </div>
    </form>
  );
}
