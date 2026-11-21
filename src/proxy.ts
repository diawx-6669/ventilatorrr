import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { defaultLocale, isLocale, LOCALE_COOKIE } from "@/i18n/config";

/**
 * 1. Locales: Russian lives at "/", Kazakh at "/kk", English at "/en".
 *    "/" is rewritten to "/ru" internally; a saved non-Russian choice redirects once.
 * 2. Admin: refreshes the Supabase session cookie before /admin renders.
 */
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    return refreshSession(req);
  }

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

async function refreshSession(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let res = NextResponse.next({ request: req });
  if (!supabaseUrl || !supabaseKey) return res;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return res;
}

export const config = {
  matcher: [
    // Pages: everything except API routes, Next internals, the auth callback and files with an extension.
    "/((?!api|_next|auth|.*\\..*).*)",
    "/api/admin/:path*",
  ],
};
