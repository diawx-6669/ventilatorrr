"use client";
import { useEffect, useRef } from "react";
import { useInView, useReducedMotion } from "motion/react";

const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** Number that rolls up to its value when it scrolls into view. A tiny rAF tween, no animation engine. */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || reduce) return;
    const start = performance.now();
    const duration = 1600;
    let raf = requestAnimationFrame(function tick(now) {
      const p = Math.min(1, (now - start) / duration);
      el.textContent = format(Math.round(value * easeOutExpo(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [inView, value, format, reduce]);

  return (
    <span ref={ref} className="tabular-nums">
      {format(value)}
    </span>
  );
}
