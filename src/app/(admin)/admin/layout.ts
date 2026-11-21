// Plain .ts (no JSX) on purpose: the GitHub Pages build only picks up .tsx route files,
// so the admin, API routes and proxy are left out of the static export automatically.
import { createElement } from "react";
import type { Metadata, Viewport } from "next";
import "../../globals.css";
import { site } from "@/config/site";
import { AdminShell } from "@/components/admin/admin-shell";

export const metadata: Metadata = {
  title: `Админка | ${site.name}`,
  robots: { index: false, follow: false },
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#080b1c", colorScheme: "dark" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return createElement(AdminShell, null, children);
}
