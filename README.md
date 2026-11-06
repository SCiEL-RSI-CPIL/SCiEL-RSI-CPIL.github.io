# SCiEL

The project page of SCiEL, recursive self-improvement through cultural transmission:
https://sciel-rsi-cpil.github.io/

The code is at [SCiEL-RSI-CPIL/sciel-rsi-framework](https://github.com/SCiEL-RSI-CPIL/sciel-rsi-framework); the runs shown on the page are in the
[Empira arena](https://research-arena.small-pine-3af7.workers.dev/experiments).

## Stack

[Astro](https://astro.build) + MDX + TypeScript, built and deployed to GitHub Pages by
`.github/workflows/deploy.yml` on every push to `main`.

## Layout

- `src/content/article.mdx` – the article text. Edit prose here.
- `src/data/` – single sources for authors and metadata (`site.ts`), section numbering (`sections.ts`)
  and the names readers see for runs and demes (`names.ts`). Internal IDs (run hashes, program ids)
  are never shown on the page.
- `src/components/` – page pieces (masthead, contents, citation) and `figures/*.astro`, the markup of
  each figure.
- `src/figures/*.ts` – the interactive figures, one ES module each, loaded when they near the viewport.
- `src/lib/` – data loading, shared figure helpers and colour tokens, tooltips.
- `src/styles/` – `tokens.css` (light/dark themes), `site.css` (layout, type), `figures.css`.
- `public/data/` – run data as JSON, produced by `node scripts/split-data.mjs <runs.js>` from the run
  viewer export.
- `public/og-card.png` – the share card, rendered from `scripts/og-card.html` by `node scripts/og-card.mjs`.
- `legacy/` – the original hand-written page, kept unchanged for reference and not deployed.
  The same version is also tagged `legacy-v1` in git. To view it: `python3 -m http.server -d legacy 8000`.

## Working on it

```sh
npm install
npm run dev      # http://localhost:4321/
npm run build    # outputs dist/
```

Use Conventional Commit messages.
