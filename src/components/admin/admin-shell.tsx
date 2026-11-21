import { fontClasses } from "@/app/fonts";

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={fontClasses}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
