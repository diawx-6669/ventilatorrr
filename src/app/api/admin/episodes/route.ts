import { NextResponse, type NextRequest } from "next/server";
import { repo } from "@/lib/repo";
import { adminRoute, refreshPublicSite } from "@/lib/admin-route";
import { episodeSchema } from "@/lib/schemas";

export const GET = adminRoute(async () => NextResponse.json({ ok: true, rows: await repo.adminEpisodes() }));

export const POST = adminRoute(async (req: NextRequest) => {
  const json = await req.json().catch(() => null);
  const parsed = episodeSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "invalid", issues: parsed.error.issues }, { status: 400 });
  const id = typeof json?.id === "string" ? json.id : undefined;
  await repo.adminSaveEpisode(parsed.data, id);
  refreshPublicSite();
  return NextResponse.json({ ok: true });
});

export const DELETE = adminRoute(async (req: NextRequest) => {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });
  await repo.adminDeleteEpisode(id);
  refreshPublicSite();
  return NextResponse.json({ ok: true });
});
