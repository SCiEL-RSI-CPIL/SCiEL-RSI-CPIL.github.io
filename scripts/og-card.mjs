// Render scripts/og-card.html to public/og-card.png (1200×630) with headless Chrome.
// Keep the author line in og-card.html in sync with src/data/site.ts.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const chrome = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
execFileSync(chrome, [
  "--headless=new",
  "--disable-gpu",
  "--hide-scrollbars",
  "--allow-file-access-from-files",
  "--force-device-scale-factor=1",
  "--window-size=1200,630",
  "--virtual-time-budget=3000",
  `--screenshot=${resolve("public/og-card.png")}`,
  `file://${resolve("scripts/og-card.html")}`,
], { stdio: "ignore" });
console.log("wrote public/og-card.png");
