import type { Metadata, Viewport } from "next";
import "../../globals.css";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: `Админка | ${site.name}`,
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#080b1c", colorScheme: "dark" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preload" href="/fonts/onest-cyr.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
