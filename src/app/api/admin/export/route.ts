import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/repo";
import { adminRoute } from "@/lib/admin-route";
import { KINDS, type Kind } from "@/lib/types";

const COLUMNS: Record<Kind, string[]> = {
  participate: ["created_at", "status", "name", "grade", "role", "pitch", "contact_type", "contact", "consent", "admin_note"],
  ideas: ["created_at", "status", "published", "category", "idea", "public_text", "votes_count", "name", "admin_note"],
  news: ["created_at", "status", "published", "when_preset", "happened_on", "what", "headline", "source", "is_anonymous", "name", "photo_path", "admin_note"],
};

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Neutralise spreadsheet formulas (CSV injection) from student-typed text.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const GET = adminRoute(async (req: NextRequest) => {
  const kind = req.nextUrl.searchParams.get("kind") as Kind;
  if (!KINDS.includes(kind)) return NextResponse.json({ ok: false }, { status: 400 });
  const status = req.nextUrl.searchParams.get("status");
  const rows = (await repo.adminList(kind)).filter((r) => !status || status === "all" || r.status === status);
  const cols = COLUMNS[kind];
  const lines = [cols.join(","), ...rows.map((r) => cols.map((c) => cell((r as Record<string, unknown>)[c])).join(","))];
  // BOM so Excel opens Cyrillic and Kazakh letters correctly.
  const body = "﻿" + lines.join("\r\n");
  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${kind}-${date}.csv"`,
      "cache-control": "no-store",
    },
  });
});
