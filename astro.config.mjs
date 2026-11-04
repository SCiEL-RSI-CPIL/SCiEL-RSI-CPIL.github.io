import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";

// GitHub Pages serves /legacy/ as /legacy/index.html; the dev server does not, so mirror that.
const legacyIndex = {
  name: "legacy-index",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === "/legacy" || req.url === "/legacy/") req.url = "/legacy/index.html";
      next();
    });
  },
};

export default defineConfig({
  site: "https://sciel-rsi-cpil.github.io",
  integrations: [mdx()],
  build: { inlineStylesheets: "auto" },
  vite: { plugins: [legacyIndex] },
});
