// Split the run viewer export (one `const DATA = {...}` file) into the JSON files the page fetches:
//   public/data/overview.json   small cross-run data, loaded once
//   public/data/runs/<id>.json  heavy per-run data, loaded when a figure needs that run
//   public/data/demo.json       the code-diff walkthrough for the records figure
// Usage: node scripts/split-data.mjs <path-to-runs.js>
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const src = process.argv[2];
if (!src) throw new Error("usage: node scripts/split-data.mjs <path-to-runs.js>");
const D = JSON.parse(readFileSync(src, "utf8").replace(/^const DATA = /, "").replace(/;\s*$/, ""));

const OVERVIEW_RUN_KEYS = ["task", "best", "hours", "nfind", "delivered", "programs", "edits"];
const { runs, demo, ...shared } = D;

const overview = { ...shared, runs: {} };
mkdirSync("public/data/runs", { recursive: true });
for (const id of D.order) {
  const r = runs[id];
  const o = Object.fromEntries(OVERVIEW_RUN_KEYS.map((k) => [k, r[k]]));
  // Cost curves need only [step, dollars, calls, best] from each engine step.
  o.steps = r.engine.steps.map((s) => s.slice(0, 4));
  overview.runs[id] = o;
  const detail = Object.fromEntries(Object.entries(r).filter(([k]) => !OVERVIEW_RUN_KEYS.includes(k)));
  writeFileSync(`public/data/runs/${id}.json`, JSON.stringify(detail));
}
writeFileSync("public/data/overview.json", JSON.stringify(overview));
writeFileSync("public/data/demo.json", JSON.stringify(demo));
