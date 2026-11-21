"use client";
import { m } from "motion/react";

/** Children rise in one after another as the group scrolls into view. */
export function Reveal({ children, className = "", as = "div", delay = 0 }: { children: React.ReactNode; className?: string; as?: "div" | "ul" | "ol"; delay?: number }) {
  const Comp = m[as];
  return (
    <Comp
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: delay } } }}
    >
      {children}
    </Comp>
  );
}

export const revealItem = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 110, damping: 18 } },
};

export function RevealItem({ children, className = "", as = "div" }: { children: React.ReactNode; className?: string; as?: "div" | "li" }) {
  const Comp = m[as];
  return (
    <Comp className={className} variants={revealItem}>
      {children}
    </Comp>
  );
}
