# SCiEL

The project page of SCiEL, recursive self-improvement through cultural transmission:
https://sciel-rsi-cpil.github.io/

The code is at [Doldrums/sciel](https://github.com/Doldrums/sciel); the runs shown on the page are in the
[Empira arena](https://research-arena.small-pine-3af7.workers.dev/experiments).

## Stack

[Astro](https://astro.build) + MDX + TypeScript, built and deployed to GitHub Pages by
`.github/workflows/deploy.yml` on every push to `main`.

## Layout

- `src/pages/` – routes.
- `src/content/` – the article text (MDX).
- `src/components/` – layout pieces (figure, TOC, citation, …).
- `src/figures/` – interactive figures, one ES module each.
- `public/` – files served as-is (icons, OG card, run data).
- `legacy/` – the original hand-written page, kept unchanged for reference and not deployed.
  The same version is also tagged `legacy-v1` in git. To view it: `python3 -m http.server -d legacy 8000`.

## Working on it

```sh
npm install
npm run dev      # http://localhost:4321/
npm run build    # outputs dist/
```

Use Conventional Commit messages.
