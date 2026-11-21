import Link from "next/link";
import { ArrowLeft, Prohibit } from "@phosphor-icons/react/dist/ssr";
import { localePath, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { fitVar } from "@/lib/fit";
import type { Accent } from "./fields";

const card: Record<Accent, string> = {
  lime: "on-lime bg-lime text-ink",
  blue: "bg-blue text-paper",
  pink: "on-pink bg-pink text-ink",
};

/** Shared layout for the three forms: the coloured card you tapped on the home page, then the form. */
export function FormPage({ locale, accent, title, lead, children }: { locale: Locale; accent: Accent; title: string; lead: string; children: React.ReactNode }) {
  const t = getDictionary(locale);
  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 px-[var(--gutter)] pb-24 pt-20 sm:pt-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-10">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Link href={localePath(locale)} className="mb-4 inline-flex h-11 items-center gap-2 rounded-full pr-4 font-semibold text-paper/85 hover:text-paper">
          <ArrowLeft weight="bold" className="size-5" aria-hidden />
          {t.nav.home}
        </Link>
        <div className={`relative overflow-hidden rounded-[28px] p-6 sm:p-8 ${card[accent]}`}>
          <div className="halftone pointer-events-none absolute inset-y-0 right-0 w-2/3 opacity-50 [mask-image:linear-gradient(to_left,black,transparent)]" aria-hidden />
          <h1
            style={fitVar(title)}
            className="display relative [--wdth:105%] text-[min(clamp(38px,9vw,84px),calc((100vw-2*var(--gutter)-48px)/(var(--n)*1.22)))] lg:text-[min(84px,calc((min(100vw,1400px)*0.42-64px)/(var(--n)*1.22)))]"
          >
            {title}
          </h1>
          <p className="relative mt-4 max-w-[42ch] text-lg font-medium leading-snug sm:text-xl">{lead}</p>
          <p className="relative mt-6 flex items-start gap-2.5 rounded-2xl bg-ink/90 p-4 text-[15px] font-semibold leading-snug text-paper">
            <Prohibit weight="bold" className="mt-0.5 size-5 shrink-0 text-orange" aria-hidden />
            {t.forms.rule}
          </p>
        </div>
      </div>
      <div className="rounded-[28px] bg-ink-2/85 p-5 ring-1 ring-white/10 backdrop-blur-md sm:p-8">{children}</div>
    </div>
  );
}
