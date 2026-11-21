"use client";
import { useEffect, useRef } from "react";
import { useReducedMotion, useScroll, useVelocity } from "motion/react";
import { site } from "@/config/site";
import { localePath } from "@/i18n/config";
import { useDict, useLocale } from "@/components/providers";
import { BLADE_PATH } from "./fan-mark";
import { SpringLink } from "./spring";

const TAU = Math.PI * 2;
const CRUISE = 3.2; // rad/s at rest
const PALETTE = ["#f5f6ff", "#f5f6ff", "#f5f6ff", "#c8ff2e", "#ff2e8b", "#3d5bff", "#ff6a13"];

type Particle = { x: number; y: number; v: number; len: number; w: number; color: string; alpha: number; phase: number };

/**
 * The hero is one machine: a desk fan you can spin, whose speed drives the wind
 * streaks on the canvas and the flutter of the title letters.
 * Inputs: cursor near the fan, scroll velocity, and drag/flick on the fan itself.
 * Everything runs in one rAF loop writing styles directly, never React state.
 */
export function Hero() {
  const t = useDict();
  const locale = useLocale();
  const reduce = useReducedMotion();
  const lines = (locale === "en" ? site.nameLinesLatin : site.nameLines) as readonly string[];
  const titleLines = lines.length ? lines : [locale === "en" ? site.nameLatin : site.name];
  const maxChars = Math.max(...titleLines.map((l) => l.length));

  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fanRef = useRef<SVGSVGElement>(null);
  const rotorRef = useRef<SVGGElement>(null);
  const ghostRef = useRef<SVGGElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    const fan = fanRef.current;
    const rotor = rotorRef.current;
    const ghost = ghostRef.current;
    if (!section || !canvas || !fan || !rotor || !ghost) return;

    if (reduce) {
      rotor.style.transform = "rotate(-12deg)";
      return;
    }

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles: Particle[] = [];
    let fanBox = { cx: 0, cy: 0, r: 1 };

    const spawn = (anywhere: boolean): Particle => {
      const fromFan = Math.random() < 0.55;
      const y = fromFan ? fanBox.cy + (Math.random() - 0.5) * fanBox.r * 1.8 : Math.random() * height;
      const x = anywhere ? Math.random() * width : fromFan ? fanBox.cx - fanBox.r * 0.2 : width + Math.random() * 80;
      const color = PALETTE[(Math.random() * PALETTE.length) | 0]!;
      return {
        x,
        y,
        v: 0.6 + Math.random() * 0.9,
        len: 10 + Math.random() * 40,
        w: Math.random() < 0.15 ? 2.2 : 1.1,
        color,
        alpha: color === "#f5f6ff" ? 0.18 + Math.random() * 0.3 : 0.45 + Math.random() * 0.35,
        phase: Math.random() * TAU,
      };
    };

    const measure = () => {
      const rect = section.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const f = fan.getBoundingClientRect();
      fanBox = { cx: f.left - rect.left + f.width / 2, cy: f.top - rect.top + f.height / 2, r: f.width / 2 };
      const count = Math.round(Math.min(150, Math.max(45, width / 9)));
      particles = Array.from({ length: count }, () => spawn(true));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(section);

    // ---- physics state
    let angle = -0.4;
    let omega = 0; // spins up from rest on load: the one orchestrated moment
    let wind = 0;
    let hover = 0;
    let dragging = false;
    let lastPointerAngle = 0;
    let lastPointerTime = 0;
    let dragOmega = 0;
    const pointer = { x: -9999, y: -9999 };

    const pointerAngle = (e: PointerEvent) => {
      const r = fan.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      fan.setPointerCapture(e.pointerId);
      lastPointerAngle = pointerAngle(e);
      lastPointerTime = performance.now();
      dragOmega = 0;
    };
    const onMoveFan = (e: PointerEvent) => {
      if (!dragging) return;
      const a = pointerAngle(e);
      let d = a - lastPointerAngle;
      if (d > Math.PI) d -= TAU;
      if (d < -Math.PI) d += TAU;
      const now = performance.now();
      const dt = Math.max(8, now - lastPointerTime) / 1000;
      angle += d;
      dragOmega = dragOmega * 0.6 + (d / dt) * 0.4;
      lastPointerAngle = a;
      lastPointerTime = now;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      omega = Math.max(-45, Math.min(45, dragOmega));
    };
    const onMoveSection = (e: PointerEvent) => {
      const r = section.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    const onLeave = () => {
      pointer.x = pointer.y = -9999;
    };

    fan.addEventListener("pointerdown", onDown);
    fan.addEventListener("pointermove", onMoveFan);
    fan.addEventListener("pointerup", onUp);
    fan.addEventListener("pointercancel", onUp);
    section.addEventListener("pointermove", onMoveSection, { passive: true });
    section.addEventListener("pointerleave", onLeave);

    let visible = true;
    let raf = 0;
    let last = performance.now();
    let clock = 0;

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;

      // Cursor near the fan adds speed; scroll velocity adds a gust.
      const dx = pointer.x - fanBox.cx;
      const dy = pointer.y - fanBox.cy;
      const dist = Math.hypot(dx, dy);
      const near = Math.max(0, 1 - dist / (fanBox.r * 1.9));
      hover += (near - hover) * Math.min(1, dt * 4);
      const gust = Math.min(22, Math.abs(scrollVelocity.get()) / 90);
      // Switch-on moment: a strong gust that settles in ~2s and ripples through the title.
      const boot = 20 * Math.exp(-clock * 1.3);
      const target = CRUISE + hover * 7 + gust + boot;

      if (!dragging) {
        const spin = Math.sign(omega || 1);
        const goal = spin * target;
        // Flicked faster than the goal: coast down slowly, like a real rotor. Slower: motor catches up.
        const k = Math.abs(omega) > target ? 0.55 : 1.6;
        omega += (goal - omega) * (1 - Math.exp(-dt * k));
        angle += omega * dt;
      }
      const speed = dragging ? Math.abs(dragOmega) : Math.abs(omega);

      rotor.style.transform = `rotate(${angle}rad)`;
      const blur = Math.min(1, Math.max(0, (speed - 5) / 16));
      ghost.style.opacity = String(blur);

      wind += (Math.min(1, speed / 22) - wind) * Math.min(1, dt * 3);

      // Title letters lean away from the fan in a travelling wave.
      const letters = letterRefs.current;
      for (let i = 0; i < letters.length; i++) {
        const el = letters[i];
        if (!el) continue;
        const wave = 0.5 + 0.5 * Math.sin(clock * 7 - (letters.length - i) * 0.55);
        const amt = wind * (0.35 + 0.65 * wave);
        el.style.transform = `translate3d(${(-amt * 9).toFixed(2)}px, ${(Math.sin(clock * 5 + i) * amt * 2).toFixed(2)}px, 0) skewX(${(amt * 9).toFixed(2)}deg)`;
      }

      // Wind streaks.
      ctx.clearRect(0, 0, width, height);
      const flow = 70 + wind * 900;
      ctx.lineCap = "round";
      for (const p of particles) {
        p.x -= p.v * flow * dt;
        p.y += Math.sin(clock * 2 + p.phase + p.x * 0.01) * 18 * dt;
        const px = p.x - pointer.x;
        const py = p.y - pointer.y;
        const d2 = px * px + py * py;
        if (d2 < 140 * 140) {
          const d = Math.sqrt(d2) || 1;
          const push = (1 - d / 140) * 160 * dt;
          p.y += (py / d) * push;
          p.x += (px / d) * push * 0.4;
        }
        if (p.x < -60 || p.y < -40 || p.y > height + 40) Object.assign(p, spawn(false));
        const len = p.len * (0.5 + wind * 2.4);
        ctx.globalAlpha = p.alpha * (0.45 + wind * 0.55);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.w;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + len, p.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      if (visible) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      started = true;
      if (!raf && visible && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    let started = false;
    const io = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      if (visible && started) start();
      else if (!visible) stop();
    });
    io.observe(section);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    // Let hydration and first paint finish before the animation loop takes the main thread.
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    const cancelIdle = window.cancelIdleCallback ?? window.clearTimeout;
    const idleId = idle(() => start(), { timeout: 1200 });

    return () => {
      cancelIdle(idleId);
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      fan.removeEventListener("pointerdown", onDown);
      fan.removeEventListener("pointermove", onMoveFan);
      fan.removeEventListener("pointerup", onUp);
      fan.removeEventListener("pointercancel", onUp);
      section.removeEventListener("pointermove", onMoveSection);
      section.removeEventListener("pointerleave", onLeave);
    };
  }, [reduce, scrollVelocity]);

  let letterIndex = 0;

  return (
    <section
      ref={sectionRef}
      className="relative isolate flex min-h-[100dvh] flex-col overflow-hidden"
      style={{ "--chars": maxChars } as React.CSSProperties}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 -z-10" aria-hidden />

      {/* The fan. Drag or flick to spin. */}
      <div className="pointer-events-none absolute -right-[28vw] top-[46%] -z-[5] w-[100vw] max-w-[760px] sm:-right-[16vw] sm:top-[30%] sm:w-[70vw] lg:right-[-4vw] lg:top-1/2 lg:w-[46vw] lg:-translate-y-1/2">
        {/* CSS entrance: visible on first paint, no JavaScript needed. */}
        <div className="relative motion-safe:animate-[fan-in_1.1s_var(--ease-out-expo)_both]">
          <svg
            ref={fanRef}
            viewBox="-125 -125 250 250"
            role="img"
            aria-label={t.hero.fanLabel}
            data-cursor={t.hero.spinHint}
            className="pointer-events-auto block w-full touch-pan-y select-none"
          >
            <defs>
              <radialGradient id="hub" cx="40%" cy="35%">
                <stop offset="0" stopColor="#ffffff" />
                <stop offset="1" stopColor="#c9cdf0" />
              </radialGradient>
            </defs>

            {/* back plate */}
            <circle r="100" fill="rgb(15 20 51 / 0.55)" />
            <circle r="100" fill="none" stroke="rgb(245 246 255 / 0.22)" strokeWidth="1.5" />

            <g ref={rotorRef} style={{ transformOrigin: "0 0", willChange: "transform" }}>
              {/* ghosts that fade in as the rotor speeds up: cheap motion blur */}
              <g ref={ghostRef} style={{ opacity: 0 }}>
                {[-14, -28, -42].map((off, i) => (
                  <g key={off} transform={`rotate(${off})`} opacity={0.42 - i * 0.12}>
                    {["var(--color-lime)", "var(--color-pink)", "var(--color-blue)"].map((c, b) => (
                      <path key={b} d={BLADE_PATH} fill={c} transform={`rotate(${b * 120}) scale(1.62)`} />
                    ))}
                  </g>
                ))}
              </g>
              {["var(--color-lime)", "var(--color-pink)", "var(--color-blue)"].map((c, b) => (
                <path key={b} d={BLADE_PATH} fill={c} transform={`rotate(${b * 120}) scale(1.62)`} />
              ))}
            </g>

            {/* front grille */}
            <g fill="none" stroke="rgb(245 246 255 / 0.16)" strokeWidth="1">
              {[34, 52, 70, 86].map((r) => (
                <circle key={r} r={r} />
              ))}
              {Array.from({ length: 24 }, (_, i) => {
                const a = (i / 24) * TAU;
                return <line key={i} x1={Math.cos(a) * 22} y1={Math.sin(a) * 22} x2={Math.cos(a) * 100} y2={Math.sin(a) * 100} />;
              })}
            </g>
            <circle r="20" fill="url(#hub)" />
            <circle r="7" fill="var(--color-ink)" />

          </svg>
          {/* Circular label in its own SVG at 2x scale, so its real font size stays legible (>= 12px). */}
          <svg viewBox="-250 -250 500 500" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
            <defs>
              <path id="ring" d="M 0 -224 A 224 224 0 1 1 -0.01 -224" />
            </defs>
            <g className="[transform-origin:0_0] animate-[spin_40s_linear_infinite] motion-reduce:animate-none">
              <text fill="rgb(245 246 255 / 0.7)" fontSize="19" fontWeight="800" letterSpacing="4.8" style={{ fontFamily: "var(--font-display)", fontStretch: "150%", textTransform: "uppercase" }}>
                <textPath href="#ring" textLength={2 * Math.PI * 224 - 16}>
                  {`${t.onAir} • ${t.hero.spinHint} • ${locale === "en" ? site.nameLatin : site.name} • `.repeat(2)}
                </textPath>
              </text>
            </g>
          </svg>
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col px-[var(--gutter)] pb-8 pt-24 sm:pb-12 lg:justify-center lg:pt-28">
        <h1
          className="display select-none [--wdth:125%] text-[calc((100vw-2*var(--gutter))/(var(--chars)*1.1))] lg:text-[calc(min(56vw,820px)/(var(--chars)*1.1))]"
          aria-label={locale === "en" ? site.nameLatin : site.name}
        >
          {titleLines.map((line, li) => (
            <span key={li} className="block whitespace-nowrap pb-[0.04em]" aria-hidden>
              {Array.from(line).map((ch, ci) => {
                const idx = letterIndex++;
                return (
                  <span
                    key={ci}
                    ref={(el) => {
                      letterRefs.current[idx] = el;
                    }}
                    className={`inline-block will-change-transform ${li === 1 ? "text-lime" : ""}`}
                  >
                    {ch}
                  </span>
                );
              })}
            </span>
          ))}
        </h1>

        <p className="rise mt-5 max-w-[30ch] text-[17px] leading-snug text-paper/90 [--delay:.35s] sm:mt-7 sm:max-w-[36ch] sm:text-xl">{t.hero.tagline}</p>

        <div className="rise mt-auto flex flex-col gap-3 pt-8 [--delay:.5s] sm:flex-row lg:mt-10">
          <SpringLink href={localePath(locale, "/join")} tone="lime" size="lg">
            {t.cta.join}
          </SpringLink>
          <SpringLink href={localePath(locale, "/idea")} tone="ghost" size="lg">
            {t.cta.idea}
          </SpringLink>
        </div>
      </div>

    </section>
  );
}
