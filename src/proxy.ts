import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";

/**
 * Locales: Russian lives at "/", Kazakh at "/kk", English at "/en".
 * "/" is rewritten to "/ru" internally; a saved non-Russian choice redirects once.
 * The admin panel (/admin) is left alone.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return NextResponse.next();

  const first = pathname.split("/")[1];

  if (first === defaultLocale) {
    // Canonical Russian URLs have no prefix.
    const url = req.nextUrl.clone();
    url.pathname = pathname.slice(defaultLocale.length + 1) || "/";
    return NextResponse.redirect(url, 308);
  }

  if (isLocale(first)) return NextResponse.next();

  const saved = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(saved) && saved !== defaultLocale && !req.nextUrl.searchParams.has("stay")) {
    const url = req.nextUrl.clone();
    url.pathname = `/${saved}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url, 307);
  }

  const url = req.nextUrl.clone();
  url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    // Pages: everything except API routes, Next internals and files with an extension.
    "/((?!api|_next|.*\\..*).*)",
  ],
};
