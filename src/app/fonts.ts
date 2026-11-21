import localFont from "next/font/local";

/**
 * Science Gothic (display) + Onest (text), each split into Cyrillic / Kazakh / Latin
 * subsets that share one family name. unicode-range makes the browser fetch the Kazakh
 * file only when a page actually has Ә Ғ Қ Ң Ө Ұ Ү Һ.
 * next/font hashes the files, adds preload tags and respects basePath (GitHub Pages).
 * Values must be literals (next/font requirement), hence the repetition.
 * The display face uses font-display: block: it is preloaded and small, and a late
 * swap from a fallback would repaint the biggest text on the page.
 */

export const sgCyr = localFont({
  src: "../fonts/sg-cyr.woff2",
  weight: "100 900",
  display: "block",
  preload: true,
  adjustFontFallback: false,
  declarations: [{ prop: "font-family", value: "'Science Gothic'" }, { prop: "font-stretch", value: "50% 200%" }, { prop: "unicode-range", value: "U+0400-045F, U+0490-0491, U+04B0-04B1" }],
});

export const sgKz = localFont({
  src: "../fonts/sg-kz.woff2",
  weight: "100 900",
  display: "block",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "font-family", value: "'Science Gothic'" }, { prop: "font-stretch", value: "50% 200%" }, { prop: "unicode-range", value: "U+0492-0493, U+049A-049B, U+04A2-04A3, U+04AE-04AF, U+04BA-04BB, U+04D8-04D9, U+04E8-04E9" }],
});

export const sgLat = localFont({
  src: "../fonts/sg-lat.woff2",
  weight: "100 900",
  display: "block",
  preload: true,
  adjustFontFallback: false,
  declarations: [{ prop: "font-family", value: "'Science Gothic'" }, { prop: "font-stretch", value: "50% 200%" }, { prop: "unicode-range", value: "U+0020-007E, U+00A0, U+00AB, U+00B7, U+00BB, U+2013-2014, U+2019, U+201C-201D, U+2022, U+2026" }],
});

export const onCyr = localFont({
  src: "../fonts/onest-cyr.woff2",
  weight: "100 900",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
  declarations: [{ prop: "font-family", value: "'Onest'" }, { prop: "unicode-range", value: "U+0400-045F, U+0490-0491, U+04B0-04B1" }],
});

export const onKz = localFont({
  src: "../fonts/onest-kz.woff2",
  weight: "100 900",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: "font-family", value: "'Onest'" }, { prop: "unicode-range", value: "U+0492-0493, U+049A-049B, U+04A2-04A3, U+04AE-04AF, U+04BA-04BB, U+04D8-04D9, U+04E8-04E9" }],
});

export const onLat = localFont({
  src: "../fonts/onest-lat.woff2",
  weight: "100 900",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
  declarations: [{ prop: "font-family", value: "'Onest'" }, { prop: "unicode-range", value: "U+0020-007E, U+00A0-00FF, U+2010-2027, U+2030-203A, U+20AC, U+2116, U+2190-2193" }],
});

/** Put on <html>: referencing the fonts is what makes Next emit their @font-face and preloads. */
export const fontClasses = [sgCyr, sgKz, sgLat, onCyr, onKz, onLat].map((f) => f.className).join(" ");
