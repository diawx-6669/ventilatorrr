"use client";
import { useState } from "react";
import { site } from "@/config/site";
import { FanMark } from "@/components/site/fan-mark";
import { browserClient } from "@/lib/supabase/browser";

export function AdminLogin({ mode, linkError }: { mode: "supabase" | "demo" | "disabled"; linkError: boolean }) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(linkError ? "error" : "idle");
  const [message, setMessage] = useState(linkError ? "Ссылка устарела или уже использована. Запроси новую." : "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    if (mode === "supabase") {
      const { error } = await browserClient().auth.signInWithOtp({
        email: value.trim().toLowerCase(),
        options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/auth/callback` },
      });
      if (error) {
        setState("error");
        setMessage("Не получилось отправить ссылку. Этот email должен быть в списке команды.");
      } else {
        setState("sent");
        setMessage("Ссылка для входа отправлена. Открой письмо на этом устройстве.");
      }
      return;
    }
    const res = await fetch("/api/admin/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: value }) });
    if (res.ok) location.reload();
    else {
      setState("error");
      setMessage(res.status === 429 ? "Слишком много попыток. Подожди 15 минут." : "Неверный пароль.");
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3">
          <FanMark className="size-12" />
          <div>
            <p className="display text-xl [--wdth:140%]">{site.name}</p>
            <p className="text-sm text-paper/75">Панель команды</p>
          </div>
        </div>
        {mode === "disabled" ? (
          <p className="mt-8 rounded-2xl bg-ink-2 p-5 text-paper/90 ring-1 ring-white/10">
            Админка выключена: подключи Supabase или задай DEMO_ADMIN_PASSWORD. Подробности в README.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-8 flex flex-col gap-3 rounded-[28px] bg-ink-2 p-6 ring-1 ring-white/10">
            <label htmlFor="cred" className="font-bold">
              {mode === "supabase" ? "Email ведущего" : "Пароль демо-режима"}
            </label>
            <input
              id="cred"
              type={mode === "supabase" ? "email" : "password"}
              autoComplete={mode === "supabase" ? "email" : "current-password"}
              required
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-14 rounded-2xl bg-ink px-4 text-[17px] outline-none ring-2 ring-white/15 focus:ring-4 focus:ring-lime"
            />
            <button disabled={state === "sending"} className="mt-2 h-14 rounded-full bg-lime font-bold text-ink disabled:opacity-60">
              {state === "sending" ? "Секунду…" : mode === "supabase" ? "Прислать ссылку для входа" : "Войти"}
            </button>
            <p role="status" className={`min-h-6 text-[15px] ${state === "error" ? "text-[#ff8fbd]" : "text-lime"}`}>
              {message}
            </p>
            {mode === "demo" && <p className="text-sm text-paper/70">Демо-режим: данные хранятся в памяти сервера и пропадут после перезапуска.</p>}
          </form>
        )}
      </div>
    </main>
  );
}
