"use client";
import { Printer, DownloadSimple } from "@phosphor-icons/react/dist/ssr";
import { useDict } from "@/components/providers";
import { SpringButton } from "./spring";

export function QrActions({ svg, name }: { svg: string; name: string }) {
  const t = useDict();
  return (
    <div className="no-print mt-8 flex flex-col gap-3 sm:flex-row">
      <SpringButton type="button" tone="paper" size="lg" onClick={() => window.print()}>
        <Printer weight="bold" className="size-5" aria-hidden />
        {t.qr.print}
      </SpringButton>
      <SpringButton
        type="button"
        tone="ghost"
        size="lg"
        onClick={() => {
          const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
          const a = document.createElement("a");
          a.href = url;
          a.download = `${name.toLowerCase()}-qr.svg`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        }}
      >
        <DownloadSimple weight="bold" className="size-5" aria-hidden />
        {t.qr.download}
      </SpringButton>
    </div>
  );
}
