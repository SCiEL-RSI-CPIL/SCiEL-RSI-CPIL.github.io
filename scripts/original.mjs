// After `astro build`: publish the original page (legacy/, unchanged since the first version of the
// site) at /orginal.html and /original.html. Its assets go to /orginal/; only the page's relative
// asset paths are rewritten, nothing else in it changes.
import { cpSync, readFileSync, writeFileSync } from "node:fs";

const SRC = "legacy";
const OUT = "dist";
const DIR = "orginal";

cpSync(`${SRC}/assets`, `${OUT}/${DIR}/assets`, { recursive: true });
for (const f of ["favicon.svg", "apple-touch-icon.png"]) cpSync(`${SRC}/${f}`, `${OUT}/${DIR}/${f}`);

const html = readFileSync(`${SRC}/index.html`, "utf8")
  .replace(/(src|href)="assets\//g, `$1="${DIR}/assets/`)
  .replace(/href="(favicon\.svg|apple-touch-icon\.png)"/g, `href="${DIR}/$1"`);
for (const name of ["orginal.html", "original.html"]) writeFileSync(`${OUT}/${name}`, html);
console.log(`original page → ${OUT}/orginal.html, ${OUT}/original.html`);
