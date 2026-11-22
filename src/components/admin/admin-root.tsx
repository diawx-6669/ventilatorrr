"use client";
import { useCallback, useEffect, useState } from "react";
import { HAS_DB, IS_STATIC } from "@/lib/deploy";
import { AdminApp } from "./admin-app";
import { AdminLogin, type LoginMode } from "./admin-login";
import { demoBackend, demoMe, rpcBackend, rpcMe, type Backend, type Me } from "./backend";

type State =
  | { phase: "loading" }
  | { phase: "error"; text: string }
  | { phase: "login"; mode: LoginMode }
  | { phase: "app"; me: Me; backend: Backend };

/** Decides which backend to use, restores the session, and shows login or the panel. */
export function AdminRoot() {
  const [state, setState] = useState<State>({ phase: "loading" });
  const mode: LoginMode = HAS_DB ? "supabase" : IS_STATIC ? "disabled" : "demo";

  const toLogin = useCallback(() => setState({ phase: "login", mode }), [mode]);
  const enter = useCallback(
    (me: Me) => setState({ phase: "app", me, backend: mode === "supabase" ? rpcBackend(toLogin) : demoBackend(toLogin) }),
    [mode, toLogin],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (mode === "supabase") {
          const me = await rpcMe();
          if (!alive) return;
          if (me) enter(me);
          else toLogin();
        } else if (mode === "demo") {
          const { me, available } = await demoMe();
          if (!alive) return;
          if (me) enter(me);
          else setState({ phase: "login", mode: available ? "demo" : "disabled" });
        } else {
          setState({ phase: "login", mode: "disabled" });
        }
      } catch (e) {
        if (alive) setState({ phase: "error", text: (e as Error).message });
      }
    })();
    return () => {
      alive = false;
    };
  }, [mode, enter, toLogin]);

  if (state.phase === "loading") {
    return (
      <main className="grid min-h-dvh place-items-center" aria-busy="true">
        <span className="sr-only">Загрузка…</span>
        <div className="size-10 animate-spin rounded-full border-4 border-white/15 border-t-lime" />
      </main>
    );
  }
  if (state.phase === "error") {
    return (
      <main className="grid min-h-dvh place-items-center px-4">
        <p className="max-w-sm rounded-2xl bg-ink-2 p-5 text-center ring-1 ring-white/10">{state.text}</p>
      </main>
    );
  }
  if (state.phase === "login") return <AdminLogin mode={state.mode} onEnter={enter} />;
  return <AdminApp me={state.me} backend={state.backend} onLogout={toLogin} />;
}
