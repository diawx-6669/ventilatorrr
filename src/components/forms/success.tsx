"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { localePath } from "@/i18n/config";
import { fitVar } from "@/lib/fit";
import { useDict, useLocale } from "@/components/providers";
import { FanMark } from "@/components/site/fan-mark";
import { SpringButton, SpringLink } from "@/components/site/spring";
import { SocialIcons } from "@/components/site/socials";
import type { Accent } from "./fields";

const BRAND = ["#c8ff2e", "#3d5bff", "#ff2e8b", "#ff6a13", "#f5f6ff"];

/** Full-screen "it's sent" moment with confetti in the show's colours. */
export function Success({ open, accent, onAgain }: { open: boolean; accent: Accent; onAgain: () => void }) {
  const t = useDict();
  const locale = useLocale();
  const reduce = useReducedMotion();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Portal to <body>: the form card uses backdrop-filter, which would trap a fixed overlay inside it.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    if (!open) return;
    headingRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onAgain();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    let cancelled = false;
    if (!reduce) {
      import("canvas-confetti").then(({ default: confetti }) => {
        if (cancelled) return;
        const fire = (x: number, angle: number) =>
          confetti({ particleCount: 90, spread: 70, startVelocity: 62, angle, origin: { x, y: 0.95 }, colors: BRAND, scalar: 1.15, ticks: 260, disableForReducedMotion: true, zIndex: 95 });
        fire(0.05, 62);
        fire(0.95, 118);
        setTimeout(() => !cancelled && confetti({ particleCount: 70, spread: 120, startVelocity: 38, origin: { x: 0.5, y: 0.35 }, colors: BRAND, shapes: ["square", "circle"], zIndex: 95 }), 350);
      });
    }
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, reduce, onAgain]);

  const bg = accent === "lime" ? "bg-lime text-ink on-lime" : accent === "blue" ? "bg-blue text-paper" : "bg-pink text-ink on-pink";

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <m.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-title"
          className={`fixed inset-0 z-[90] flex flex-col items-center justify-center overflow-hidden px-6 text-center ${bg}`}
          initial={{ clipPath: "circle(0% at 50% 100%)", opacity: reduce ? 0 : 1 }}
          animate={{ clipPath: "circle(150% at 50% 100%)", opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0.3 : 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <m.div initial={{ scale: 0.4, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 90, damping: 12, delay: 0.15 }}>
            <FanMark className="size-40 [&_g]:!animate-[spin_0.6s_linear_infinite] motion-reduce:[&_g]:!animate-none sm:size-52" spin />
          </m.div>
          <h2
            id="success-title"
            ref={headingRef}
            tabIndex={-1}
            style={fitVar(t.success.title)}
            className="display mt-8 max-w-[16ch] text-[min(clamp(34px,8vw,84px),calc((100vw-48px)/(var(--n)*1.15)))] leading-[0.95] outline-none [--wdth:105%]"
          >
            {t.success.title}
          </h2>
          <p className="mt-5 max-w-[38ch] text-lg font-medium sm:text-xl">{t.success.text}</p>
          <div className="mt-10 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <SpringButton type="button" tone="ink" size="lg" onClick={onAgain}>
              {t.success.again}
            </SpringButton>
            <SpringLink href={localePath(locale)} tone="paper" size="lg" arrow={false}>
              {t.success.home}
            </SpringLink>
          </div>
          <div className="mt-10 flex flex-col items-center gap-3">
            <p className="text-[15px] font-bold">{t.success.follow}</p>
            <SocialIcons tone="ink" size="lg" />
          </div>
        </m.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
