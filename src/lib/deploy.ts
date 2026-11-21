/**
 * Where the site runs.
 * - Server (Vercel, `next start`): everything works.
 * - Static (GitHub Pages): HTML only, no server, so forms, votes and admin are off.
 * Set at build time by next.config.ts.
 */
export const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "1";
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** For raw <a href> and asset URLs; <Link> adds basePath on its own. */
export const withBase = (path: string) => `${BASE_PATH}${path}`;
