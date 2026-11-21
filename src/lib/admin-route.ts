import "server-only";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdmin } from "./admin-auth";

/** Wraps an admin route handler: 401 for strangers, 500 with a log line for crashes. */
export function adminRoute<A extends unknown[]>(handler: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    const admin = await getAdmin();
    if (!admin) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    try {
      return await handler(...args);
    } catch (e) {
      console.error("admin", e);
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "server" }, { status: 500 });
    }
  };
}

/** The public pages live under /[lang]; refresh every locale at once. */
export function refreshPublicSite() {
  revalidatePath("/[lang]", "layout");
}
