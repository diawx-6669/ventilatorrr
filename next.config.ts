import type { NextConfig } from "next";

/**
 * Two ways to run:
 * - default (Vercel / `next start`): full site; forms and votes go through our API routes.
 * - GITHUB_PAGES=1: static export for https://<user>.github.io/<repo>/. No server: with the
 *   public Supabase keys set, the browser talks to Supabase directly (forms, votes, admin).
 *   Only .tsx route files are built, which leaves out the API routes (route.ts) and the proxy.
 */
const pages = process.env.GITHUB_PAGES === "1";
const basePath = pages ? (process.env.PAGES_BASE_PATH ?? "/ventilatorrr") : "";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  env: {
    NEXT_PUBLIC_STATIC: pages ? "1" : "",
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(pages
    ? {
        output: "export",
        basePath,
        trailingSlash: true,
        pageExtensions: ["tsx"],
        images: { unoptimized: true },
      }
    : {
        images: { remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com" }] },
        async headers() {
          return [{ source: "/:path*", headers: securityHeaders }];
        },
      }),
};

export default nextConfig;
