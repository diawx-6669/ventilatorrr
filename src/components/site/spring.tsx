"use client";
import Link from "next/link";
import { m } from "motion/react";
import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";

export type Tone = "lime" | "blue" | "pink" | "orange" | "paper" | "ghost" | "ink";

export const toneClass: Record<Tone, string> = {
  lime: "bg-lime text-ink",
  blue: "bg-blue text-paper",
  pink: "bg-pink text-ink",
  orange: "bg-orange text-ink",
  paper: "bg-paper text-ink",
  ink: "bg-ink text-paper",
  ghost: "bg-ink/75 text-paper ring-2 ring-inset ring-paper/40 backdrop-blur hover:ring-paper/80",
};

const sizes = {
  md: "h-12 px-5 text-[15px]",
  lg: "h-14 px-7 text-[17px]",
};

export const springTap = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.94 },
  transition: { type: "spring" as const, stiffness: 520, damping: 17 },
};

export function SpringLink({
  href,
  tone = "lime",
  size = "md",
  arrow = true,
  className = "",
  children,
}: {
  href: string;
  tone?: Tone;
  size?: keyof typeof sizes;
  arrow?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    // tabIndex -1: Motion makes tap targets focusable; the link inside is the real focus stop.
    <m.div {...springTap} tabIndex={-1} className={`inline-flex ${className}`}>
      <Link
        href={href}
        className={`inline-flex w-full items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-[box-shadow] ${toneClass[tone]} ${sizes[size]}`}
      >
        {children}
        {arrow && <ArrowUpRight weight="bold" className="size-5" aria-hidden />}
      </Link>
    </m.div>
  );
}

export function SpringButton({
  tone = "lime",
  size = "md",
  className = "",
  children,
  ...props
}: Omit<React.ComponentProps<typeof m.button>, "children"> & { tone?: Tone; size?: keyof typeof sizes; children: React.ReactNode }) {
  return (
    <m.button
      {...springTap}
      {...props}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold disabled:cursor-not-allowed disabled:opacity-60 ${toneClass[tone]} ${sizes[size]} ${className}`}
    >
      {children}
    </m.button>
  );
}
