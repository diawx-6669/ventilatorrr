// After `GITHUB_PAGES=1 next build`: shape ./out for GitHub Pages.
// 1. Russian is the default language and lives at the site root, so copy out/ru/* to out/.
// 2. .nojekyll, otherwise Pages' Jekyll step drops the _next folder (leading underscore).
// 3. 404.html: GitHub Pages serves it for unknown paths.
import { cpSync, existsSync, writeFileSync } from "node:fs";

const out = "out";
if (!existsSync(`${out}/ru`)) throw new Error("out/ru not found: run the Pages build first");
cpSync(`${out}/ru`, out, { recursive: true });
writeFileSync(`${out}/.nojekyll`, "");
cpSync(`${out}/ru/index.html`, `${out}/404.html`);
console.log("Pages output ready in ./out");
