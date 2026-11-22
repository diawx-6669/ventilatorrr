import type { Metadata, Viewport } from "next";
import "../../globals.css";
import { site } from "@/config/site";
import { withBase } from "@/lib/deploy";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: `Админка | ${site.name}`,
  robots: { index: false, follow: false },
  icons: { icon: withBase("/icon.svg") },
};
export const viewport: Viewport = { themeColor: "#080b1c", colorScheme: "dark" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
