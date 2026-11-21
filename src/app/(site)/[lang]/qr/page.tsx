import type { Metadata } from "next";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { site } from "@/config/site";
import { localePath, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionary";
import { fitVar } from "@/lib/fit";
import { FanMark } from "@/components/site/fan-mark";
import { QrActions } from "@/components/site/qr-actions";

export async function generateMetadata({ params }: PageProps<"/[lang]/qr">): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(lang as Locale).footer.poster, robots: { index: false }, alternates: { canonical: localePath(lang as Locale, "/qr") } };
}

/** Printable poster. Points at the home page of the current language. */
export default async function QrPage({ params }: PageProps<"/[lang]/qr">) {
  const { lang } = await params;
  const locale = lang as Locale;
  const t = getDictionary(locale);

  let base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    base = `${proto}://${host}`;
  }
  const target = new URL(localePath(locale), base).toString();
  const svg = await QRCode.toString(target, { type: "svg", errorCorrectionLevel: "H", margin: 0, color: { dark: "#080b1cff", light: "#00000000" } });
  const name = locale === "en" ? site.nameLatin : site.name;

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center px-[var(--gutter)] pb-20 pt-24 text-center print:pt-0">
      <div className="poster w-full rounded-[36px] bg-lime p-6 text-ink sm:p-10 print:rounded-none print:bg-white print:p-0">
        <div className="flex items-center justify-center gap-3">
          <FanMark className="size-12 shrink-0 sm:size-16" />
          <span style={fitVar(name)} className="display text-[min(60px,calc((min(100vw,768px)-2*var(--gutter)-48px-80px-64px)/(var(--n)*1.3)))] [--wdth:140%]">{name}</span>
        </div>
        <h1 style={fitVar(t.qr.title)} className="display mx-auto mt-6 max-w-[14ch] text-[min(clamp(30px,6.5vw,58px),calc((min(100vw,768px)-2*var(--gutter)-80px)/(var(--n)*1.12)))] leading-[0.95] [--wdth:100%]">{t.qr.title}</h1>
        <div className="relative mx-auto mt-8 aspect-square w-full max-w-[460px] rounded-[28px] bg-paper p-6 sm:p-8 print:max-w-[14cm] print:p-0">
          <div className="size-full [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} />
          <div className="absolute left-1/2 top-1/2 grid size-[22%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-paper p-1.5">
            <FanMark className="size-full" />
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-[32ch] text-lg font-semibold sm:text-xl">{t.qr.sub}</p>
        <p className="mt-2 break-all text-sm font-medium opacity-75">{target.replace(/^https?:\/\//, "")}</p>
      </div>
      <QrActions svg={svg} name={name} />
    </div>
  );
}
