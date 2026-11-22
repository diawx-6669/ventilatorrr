"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { z } from "zod";
import { AnimatePresence, m } from "motion/react";
import { PaperPlaneTilt, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { useDict } from "@/components/providers";
import type { Kind } from "@/lib/types";
import { SpringButton } from "@/components/site/spring";
import { Honeypot, type Accent } from "./fields";
import { Success } from "./success";
import { CAN_SUBMIT, DIRECT } from "@/lib/deploy";
import { MIN_FILL_MS } from "@/lib/submission";

/** Form state that survives switching apps to copy a nickname. Kept on this device only. */
export function useDraft<T extends object>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);
  const loaded = useRef(false);

  // Restore after hydration (server HTML has empty fields), in a frame callback.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) setValue((v) => ({ ...v, ...(JSON.parse(raw) as Partial<T>) }));
      } catch {}
      loaded.current = true;
    });
    return () => cancelAnimationFrame(id);
  }, [key]);

  useEffect(() => {
    if (!loaded.current) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
    }, 300);
    return () => clearTimeout(id);
  }, [key, value]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {}
    setValue(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, setValue, clear] as const;
}

type Phase = "idle" | "sending" | "done";

/**
 * Shared submit flow: validate with the same zod schema as the server,
 * focus the first problem, post, show the success screen.
 */
export function useSubmit<S extends z.ZodType>(kind: Kind, schema: S) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [banner, setBanner] = useState<"generic" | "rateLimited" | "invalid" | null>(null);
  const [honeypot, setHoneypot] = useState("");
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const focusFirstError = () =>
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`form[data-form="${kind}"] :is(input, textarea)[aria-invalid='true'], form[data-form="${kind}"] fieldset[aria-invalid='true'] input`)
        ?.focus();
    });

  const submit = async (payload: unknown, photo?: File | null) => {
    setBanner(null);
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const out: Record<string, string> = {};
      for (const issue of parsed.error.issues) out[String(issue.path[0] ?? "_")] ??= issue.message;
      setErrors(out);
      setBanner("invalid");
      focusFirstError();
      return false;
    }
    setErrors({});
    if (!CAN_SUBMIT) return false;
    setPhase("sending");
    if (DIRECT) {
      // Static site: straight to Supabase. Bots (honeypot / instant submit) get a fake success.
      if (honeypot || Date.now() - startedAt.current < MIN_FILL_MS) {
        setPhase("done");
        return true;
      }
      try {
        const { submitDirect } = await import("@/lib/direct");
        const result = await submitDirect(kind, payload, photo);
        if (result === "ok") {
          setPhase("done");
          return true;
        }
        setPhase("idle");
        setBanner(result === "rate_limited" ? "rateLimited" : "generic");
      } catch {
        setPhase("idle");
        setBanner("generic");
      }
      return false;
    }
    const body = new FormData();
    body.set("payload", JSON.stringify(payload));
    body.set("website", honeypot);
    body.set("elapsed", String(Date.now() - startedAt.current));
    if (photo) body.set("photo", photo);
    try {
      const res = await fetch(`/api/submit/${kind}`, { method: "POST", body });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; fields?: Record<string, string> };
      if (res.ok && data.ok) {
        setPhase("done");
        return true;
      }
      setPhase("idle");
      if (res.status === 429) setBanner("rateLimited");
      else if (data.fields) {
        setErrors(data.fields);
        setBanner("invalid");
        focusFirstError();
      } else setBanner("generic");
    } catch {
      setPhase("idle");
      setBanner("generic");
    }
    return false;
  };

  const reset = () => {
    setPhase("idle");
    setErrors({});
    setBanner(null);
    startedAt.current = Date.now();
  };

  /** Clear a field's error as soon as the student edits it. */
  const clearError = (key: string) =>
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });

  return { kind, errors, phase, banner, submit, reset, clearError, honeypot, setHoneypot };
}

export function FormFrame({
  accent,
  onSubmit,
  state,
  children,
  onAgain,
}: {
  accent: Accent;
  onSubmit: () => void;
  state: ReturnType<typeof useSubmit>;
  children: React.ReactNode;
  onAgain: () => void;
}) {
  const t = useDict();
  const tone = accent === "lime" ? "lime" : accent === "blue" ? "blue" : "pink";
  const bannerText =
    state.banner === "rateLimited" ? t.forms.errors.rateLimited : state.banner === "invalid" ? t.forms.errors.invalid : state.banner === "generic" ? t.forms.errors.generic : null;

  return (
    <>
      <form
        data-form={state.kind}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (state.phase !== "sending") onSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <Honeypot value={state.honeypot} onChange={state.setHoneypot} />
        {!CAN_SUBMIT && (
          <p className="flex items-start gap-2 rounded-2xl bg-orange/15 p-4 text-[16px] font-semibold text-paper ring-1 ring-orange/50">
            <WarningCircle weight="bold" className="mt-0.5 size-5 shrink-0 text-orange" aria-hidden />
            {t.forms.staticNotice}
          </p>
        )}
        {children}

        <div aria-live="assertive" role="alert">
          <AnimatePresence>
            {bannerText && (
              <m.p
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-2xl bg-[#ff8fbd]/12 p-4 text-[16px] font-semibold text-[#ffc2da] ring-1 ring-[#ff8fbd]/50"
              >
                <WarningCircle weight="bold" className="mt-0.5 size-5 shrink-0" aria-hidden />
                {bannerText}
              </m.p>
            )}
          </AnimatePresence>
        </div>

        <SpringButton type="submit" tone={tone} size="lg" className="mt-1 w-full sm:w-auto sm:self-start" disabled={!CAN_SUBMIT || state.phase === "sending"}>
          {state.phase === "sending" ? t.forms.sending : t.forms.submit}
          <PaperPlaneTilt weight="bold" className={`size-5 ${state.phase === "sending" ? "motion-safe:animate-pulse" : ""}`} aria-hidden />
        </SpringButton>
        <p className="text-sm text-paper/70">{t.forms.draftSaved}</p>
      </form>

      <Success open={state.phase === "done"} accent={accent} onAgain={onAgain} />
    </>
  );
}
