import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://sciel-rsi-cpil.github.io",
  integrations: [mdx()],
  build: { inlineStylesheets: "auto" },
  // three.js (~550 kB) is one lazily loaded chunk, fetched only when a 3D figure nears the viewport.
  vite: { build: { chunkSizeWarningLimit: 600 } },
});
