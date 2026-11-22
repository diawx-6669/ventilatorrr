import type { AdminRow, Kind } from "./types";

const COLUMNS: Record<Kind, string[]> = {
  participate: ["created_at", "status", "name", "grade", "role", "pitch", "contact_type", "contact", "consent", "admin_note"],
  ideas: ["created_at", "status", "published", "category", "idea", "public_text", "votes_count", "name", "admin_note"],
  news: ["created_at", "status", "published", "when_preset", "happened_on", "what", "headline", "source", "is_anonymous", "name", "photo_url", "admin_note"],
};

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Neutralise spreadsheet formulas (CSV injection) from student-typed text.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV with a BOM, so Excel opens Cyrillic and Kazakh letters correctly. */
export function toCsv(kind: Kind, rows: AdminRow[]): string {
  const cols = COLUMNS[kind];
  const lines = [cols.join(","), ...rows.map((r) => cols.map((c) => cell((r as Record<string, unknown>)[c])).join(","))];
  return "﻿" + lines.join("\r\n");
}

export function downloadCsv(kind: Kind, rows: AdminRow[]) {
  const blob = new Blob([toCsv(kind, rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
