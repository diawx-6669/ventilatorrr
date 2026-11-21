// Visual QA without eyes: run against a running site.
//   node scripts/qa.mjs [http://localhost:3000]
//
// 1. Kazakh glyphs: asks Chromium (via DevTools protocol) which font *actually*
//    painted Ә Ғ Қ Ң Ө Ұ Ү Һ І in both the display and the text face. Any
//    fallback font fails the check.
// 2. Overflow: every page x every language x phone/desktop, looking for
//    horizontal page scroll and display headings that stick out of their box.
//
// Needs Playwright with Chromium (npx playwright install chromium).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

const base = process.argv[2] ?? "http://localhost:3000";
const KZ = "ӘәҒғҚқҢңӨөҰұҮүҺһІі";
let failed = 0;

const browser = await chromium.launch();

// ---------------------------------------------------------------- 1. fonts
{
  const page = await browser.newPage();
  await page.goto(`${base}/kk`, { waitUntil: "networkidle" });
  await page.evaluate((kz) => {
    for (const [id, family] of [
      ["kz-display", "var(--font-display)"],
      ["kz-text", "var(--font-sans)"],
    ]) {
      const el = document.createElement("div");
      el.id = id;
      el.textContent = kz;
      el.style.cssText = `font-family:${family};font-size:40px;position:absolute;top:0;left:0`;
      document.body.append(el);
    }
    return document.fonts.ready;
  }, KZ);
  await page.waitForTimeout(500);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable");
  await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument");
  for (const [id, expected] of [
    ["kz-display", "Science Gothic"],
    ["kz-text", "Onest"],
  ]) {
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: `#${id}` });
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
    const ok = fonts.length === 1 && fonts[0].familyName.includes(expected);
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"} ${expected}: ${KZ} -> ${fonts.map((f) => `${f.familyName} (${f.glyphCount})`).join(", ")}`);
  }
  await page.close();
}

// ---------------------------------------------------------------- 2. overflow
const pages = ["", "/join", "/idea", "/news", "/qr"];
const locales = ["", "/kk", "/en"];
const viewports = [
  { name: "320", width: 320, height: 640 },
  { name: "375", width: 375, height: 812 },
  { name: "1440", width: 1440, height: 900 },
];
for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  for (const loc of locales) {
    for (const p of pages) {
      const url = `${base}${loc}${p}` || base;
      await page.goto(url, { waitUntil: "networkidle" });
      await page.waitForTimeout(300);
      const problems = await page.evaluate(() => {
        const out = [];
        const doc = document.documentElement;
        if (doc.scrollWidth > window.innerWidth + 1) out.push(`page scrolls sideways (${doc.scrollWidth}px)`);
        for (const el of document.querySelectorAll(".display")) {
          if (el.closest("[aria-hidden='true'], footer")) continue;
          const parent = el.parentElement;
          if (!parent) continue;
          const r = el.getBoundingClientRect();
          const box = parent.getBoundingClientRect();
          const overflow = el.scrollWidth - el.clientWidth;
          const inRail = !!el.closest(".rail"); // horizontal scrollers sit past the screen edge on purpose
          if (overflow > 2 || r.right > box.right + 2 || (!inRail && r.right > window.innerWidth + 1))
            out.push(`"${el.textContent.trim().slice(0, 30)}" overflows by ${Math.round(Math.max(overflow, r.right - box.right))}px`);
        }
        return out;
      });
      if (problems.length) failed++;
      console.log(`${problems.length ? "FAIL" : "PASS"} ${vp.name} ${url}${problems.length ? "\n   " + problems.join("\n   ") : ""}`);
    }
  }
  await ctx.close();
}

await browser.close();
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
