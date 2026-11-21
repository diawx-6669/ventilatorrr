"use client";
import { useEffect, useRef } from "react";
import { m, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

/**
 * Card that leans toward the cursor, and toward the tilt of the phone where the
 * browser exposes the gyroscope without a permission prompt (Android).
 */
export function Tilt({ children, className = "", max = 9, glare = true }: { children: React.ReactNode; className?: string; max?: number; glare?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const sx = useSpring(px, { stiffness: 180, damping: 18 });
  const sy = useSpring(py, { stiffness: 180, damping: 18 });
  const rotateY = useTransform(sx, [0, 1], [-max, max]);
  const rotateX = useTransform(sy, [0, 1], [max, -max]);
  const glareBg = useTransform(
    [sx, sy],
    ([x, y]) => `radial-gradient(circle at ${(x as number) * 100}% ${(y as number) * 100}%, rgb(255 255 255 / 0.5), transparent 55%)`,
  );

  useEffect(() => {
    if (reduce) return;
    if (!window.matchMedia("(hover: none)").matches) return;
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: unknown } | undefined;
    if (!DOE || typeof DOE.requestPermission === "function") return; // iOS needs a prompt: skip.
    const onTilt = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      px.set(Math.min(1, Math.max(0, 0.5 + e.gamma / 50)));
      py.set(Math.min(1, Math.max(0, 0.5 + (e.beta - 45) / 50)));
    };
    window.addEventListener("deviceorientation", onTilt);
    return () => window.removeEventListener("deviceorientation", onTilt);
  }, [reduce, px, py]);

  // Same markup with or without reduced motion (the server can't know), so hydration matches.
  return (
    <div className="[perspective:1000px]">
      <m.div
        ref={ref}
        className={`group relative [transform-style:preserve-3d] ${className}`}
        style={{ rotateX, rotateY }}
        onPointerMove={(e) => {
          if (reduce || e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          px.set((e.clientX - r.left) / r.width);
          py.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => {
          px.set(0.5);
          py.set(0.5);
        }}
      >
        {children}
        {glare && (
          <m.div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 mix-blend-soft-light transition-opacity duration-300 group-hover:opacity-100 motion-reduce:hidden"
            style={{ background: glareBg }}
          />
        )}
      </m.div>
    </div>
  );
}
