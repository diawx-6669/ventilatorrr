// .ts on purpose, see layout.ts.
import { createElement } from "react";
import { AdminEntry } from "@/components/admin/admin-entry";

export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { error } = await searchParams;
  return createElement(AdminEntry, { error: typeof error === "string" ? error : undefined });
}
