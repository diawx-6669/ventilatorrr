import { NextResponse, type NextRequest } from "next/server";
import { demoRepo } from "@/lib/repo/demo";
import { adminRoute, refreshPublicSite } from "@/lib/admin-route";
import { adminPatchSchema } from "@/lib/schemas";
import { KINDS, type Kind } from "@/lib/types";

// Demo mode only (see lib/admin-auth.ts). With Supabase the browser calls admin_* RPCs.

export const GET = adminRoute(async (req: NextRequest) => {
  const kind = req.nextUrl.searchParams.get("kind") as Kind;
  if (!KINDS.includes(kind)) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true, rows: await demoRepo.adminList(kind) });
});

export const PATCH = adminRoute(async (req: NextRequest) => {
  const parsed = adminPatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  const patch = { ...parsed.data };
  // Publishing implies approval; rejecting or reopening takes the item off the site.
  if (patch.published === true) patch.status = "approved";
  if (patch.status && patch.status !== "approved" && patch.kind !== "participate") patch.published = false;
  if (patch.kind === "participate") delete patch.published;
  await demoRepo.adminPatch(patch);
  if (patch.kind !== "participate") refreshPublicSite();
  return NextResponse.json({ ok: true });
});

export const DELETE = adminRoute(async (req: NextRequest) => {
  const kind = req.nextUrl.searchParams.get("kind") as Kind;
  const id = req.nextUrl.searchParams.get("id");
  if (!KINDS.includes(kind) || !id) return NextResponse.json({ ok: false }, { status: 400 });
  await demoRepo.adminDelete(kind, id);
  if (kind !== "participate") refreshPublicSite();
  return NextResponse.json({ ok: true });
});
