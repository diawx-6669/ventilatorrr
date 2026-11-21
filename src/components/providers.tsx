"use client";
import { createContext, useContext } from "react";
import { LazyMotion, MotionConfig } from "motion/react";
import type { Locale } from "@/i18n/config";
import { getDictionary, type Dictionary } from "@/i18n/dictionary";

// Animation features load in a separate chunk after the page is interactive.
const loadFeatures = () => import("./motion-features").then((mod) => mod.default);

const LocaleContext = createContext<Locale>("ru");

export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return (
    <LocaleContext.Provider value={locale}>
      {/* reducedMotion="user": with the OS setting on, transforms are dropped and only opacity animates. */}
      <MotionConfig reducedMotion="user">
        <LazyMotion features={loadFeatures} strict>
          {children}
        </LazyMotion>
      </MotionConfig>
    </LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useDict(): Dictionary {
  return getDictionary(useContext(LocaleContext));
}
