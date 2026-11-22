"use client";
import { useEffect, useId, useState } from "react";
import { Eye, EyeSlash, Key, SignIn } from "@phosphor-icons/react/dist/ssr";
import { site } from "@/config/site";
import { FanMark } from "@/components/site/fan-mark";
import { IS_STATIC } from "@/lib/deploy";
import { demoLogin, rpcClaim, rpcLogin, type Me } from "./backend";

export type LoginMode = "supabase" | "demo" | "disabled";

const field = "h-14 w-full rounded-2xl bg-ink px-4 text-[17px] outline-none ring-2 ring-white/15 focus:ring-4 focus:ring-lime";

/**
 * Sign in. With Supabase there are two doors:
 * - "Войти": email + password;
 * - "У меня приглашение": email + one-time code from the owner + a new password.
 * An invite link (/admin/?email=…&invite=…) opens the second door with everything filled in.
 */
export function AdminLogin({ mode, onEnter }: { mode: LoginMode; onEnter: (me: Me) => void }) {
  const [door, setDoor] = useState<"login" | "invite">("login");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ids = { email: useId(), code: useId(), password: useId() };

  useEffect(() => {
    // Read the invite link once, then drop the code from the address bar.
    const q = new URLSearchParams(location.search);
    const invite = q.get("invite");
    const mail = q.get("email");
    if (!invite && !mail) return;
    const id = requestAnimationFrame(() => {
      if (mail) setEmail(mail);
      if (invite) {
        setCode(invite);
        setDoor("invite");
      }
      history.replaceState(null, "", location.pathname);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "demo") {
        await demoLogin(password);
        onEnter({ email: "demo@local", owner: true });
      } else if (door === "invite") {
        onEnter(await rpcClaim(email, code, password));
      } else {
        onEnter(await rpcLogin(email, password));
      }
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <FanMark className="size-12" spin />
          <div>
            <p className="display text-xl [--wdth:140%]">{site.name}</p>
            <p className="text-sm text-paper/75">Панель команды</p>
          </div>
        </div>

        {mode === "disabled" ? (
          <p className="mt-8 rounded-2xl bg-ink-2 p-5 text-paper/90 ring-1 ring-white/10">
            Админка выключена: нет ключей Supabase{IS_STATIC ? " в сборке" : " и не задан DEMO_ADMIN_PASSWORD"}. Подробности в README, раздел «Подключение Supabase».
          </p>
        ) : (
          <form onSubmit={submit} className="mt-8 flex flex-col gap-4 rounded-[28px] bg-ink-2 p-6 ring-1 ring-white/10">
            {mode === "supabase" && (
              <div role="tablist" aria-label="Способ входа" className="grid grid-cols-2 gap-1 rounded-full bg-ink p-1 ring-1 ring-white/10">
                {(
                  [
                    ["login", "Войти", SignIn],
                    ["invite", "Приглашение", Key],
                  ] as const
                ).map(([key, label, Icon]) => (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={door === key}
                    onClick={() => {
                      setDoor(key);
                      setError("");
                    }}
                    className={`flex h-11 items-center justify-center gap-1.5 rounded-full text-sm font-bold transition-colors ${door === key ? "bg-lime text-ink" : "text-paper/80 hover:text-paper"}`}
                  >
                    <Icon weight="bold" className="size-4" aria-hidden />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {mode === "supabase" && (
              <label htmlFor={ids.email} className="grid gap-1.5 font-bold">
                Email
                <input id={ids.email} type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
              </label>
            )}

            {mode === "supabase" && door === "invite" && (
              <label htmlFor={ids.code} className="grid gap-1.5 font-bold">
                Код приглашения
                <input
                  id={ids.code}
                  required
                  autoComplete="one-time-code"
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="ABCD2345"
                  className={`${field} font-mono tracking-[0.2em]`}
                />
              </label>
            )}

            <label htmlFor={ids.password} className="grid gap-1.5 font-bold">
              {mode === "demo" ? "Пароль демо-режима" : door === "invite" ? "Придумай пароль" : "Пароль"}
              <span className="relative">
                <input
                  id={ids.password}
                  type={show ? "text" : "password"}
                  autoComplete={door === "invite" ? "new-password" : "current-password"}
                  required
                  minLength={mode === "supabase" && door === "invite" ? 8 : undefined}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${field} pr-14`}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Скрыть пароль" : "Показать пароль"}
                  className="absolute right-2 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-paper/70 hover:bg-white/10 hover:text-paper"
                >
                  {show ? <EyeSlash className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
                </button>
              </span>
              {door === "invite" && <span className="text-sm font-normal text-paper/70">Минимум 8 символов. Дальше входишь с ним.</span>}
            </label>

            <button disabled={busy} className="mt-1 h-14 rounded-full bg-lime font-bold text-ink disabled:opacity-60">
              {busy ? "Секунду…" : door === "invite" ? "Активировать и войти" : "Войти"}
            </button>
            <p role="alert" className="min-h-6 text-[15px] text-[#ff8fbd]">
              {error}
            </p>
            {mode === "supabase" && door === "login" && (
              <p className="text-sm text-paper/70">Нет пароля или забыл его? Попроси владельца прислать ссылку-приглашение.</p>
            )}
            {mode === "demo" && <p className="text-sm text-paper/70">Демо-режим: данные хранятся в памяти сервера и пропадут после перезапуска.</p>}
          </form>
        )}
      </div>
    </main>
  );
}
