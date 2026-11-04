import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

export default defineConfig({
  site: "https://sciel-rsi-cpil.github.io",
  integrations: [mdx()],
  build: { inlineStylesheets: "auto" },
});
