"use client";
import { useEffect, useRef, useState } from "react";
import { m, useMotionValue, useSpring } from "motion/react";

/**
 * Desktop-only cursor: a dot that tracks exactly and a ring that trails on a spring.
 * Over links and buttons the ring grows; over elements with data-cursor it shows that label.
 */
export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [pressed, setPressed] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const rx = useSpring(x, { stiffness: 380, damping: 30, mass: 0.6 });
  const ry = useSpring(y, { stiffness: 380, damping: 30, mass: 0.6 });
  const last = useRef<Element | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const update = () => setEnabled(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    document.documentElement.classList.add("has-cursor");
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
      const target = e.target as Element | null;
      if (target === last.current) return;
      last.current = target;
      const labelled = target?.closest?.("[data-cursor]");
      setLabel(labelled?.getAttribute("data-cursor") ?? null);
      setActive(!!target?.closest?.("a, button, [role='button'], label, select, summary"));
    };
    const down = () => setPressed(true);
    const up = () => setPressed(false);
    const leave = () => {
      x.set(-100);
      y.set(-100);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      document.documentElement.classList.remove("has-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [enabled, x, y]);

  if (!enabled) return null;
  const size = label ? 88 : active ? 56 : 34;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70]">
      <m.div className="absolute left-0 top-0" style={{ x: rx, y: ry }}>
        <m.div
          className="grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-lime text-[11px] font-black uppercase tracking-wider text-ink"
          animate={{
            width: size,
            height: size,
            backgroundColor: label ? "rgb(200 255 46 / 1)" : "rgb(200 255 46 / 0)",
            scale: pressed ? 0.82 : 1,
          }}
          transition={{ type: "spring", stiffness: 420, damping: 26 }}
        >
          {label}
        </m.div>
      </m.div>
      <m.div className="absolute left-0 top-0 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime" style={{ x, y }} />
    </div>
  );
}
