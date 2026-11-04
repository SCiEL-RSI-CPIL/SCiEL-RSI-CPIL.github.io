// Page entry: navigation, the "Run SCiEL" panel, the run line, and lazy mounting of figures.
// Each figure lives in src/figures/<name>.ts and exports `mount(): Promise<void> | void`.
// A figure's module (and its data, and three.js if it needs it) loads only when its root element
// comes within ~800px of the viewport.

import { esc } from "../lib/core";
import { loadOverview } from "../lib/data";
import { currentRunId, onRunChange } from "../lib/run-state";
import { ARENA_URL, TASK_NAMES, runMeta, runName } from "../data/names";
import { initChrome } from "./chrome";

type Loader = () => Promise<{ mount: () => Promise<void> | void }>;

// [root element id, module]. Order matters only for modules that import each other.
const FIGURES: [string, Loader][] = [
  ["hero", () => import("../figures/disk")],
  ["cost", () => import("../figures/cost")],
  ["disk", () => import("../figures/replay")],
  ["funnel", () => import("../figures/culture")],
  ["chart", () => import("../figures/progress")],
  ["recs", () => import("../figures/records")],
  ["mcompare", () => import("../figures/compare")],
  ["niche3d", () => import("../figures/niches")],
  ["map3d", () => import("../figures/relief")],
];

function mountLazily(): void {
  const pending = new Map<Element, Loader>();
  for (const [id, load] of FIGURES) {
    const n = document.getElementById(id);
    if (n) pending.set(n, load);
    else console.warn(`figure root #${id} not on this page`);
  }
  const start = (n: Element) => {
    const load = pending.get(n);
    if (!load) return;
    pending.delete(n);
    load()
      .then((m) => m.mount())
      .catch((err) => console.error(`figure #${n.id} failed`, err));
  };
  if (typeof IntersectionObserver === "undefined") {
    [...pending.keys()].forEach(start);
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          io.unobserve(e.target);
          start(e.target);
        }
      }
    },
    { rootMargin: "800px 0px" },
  );
  pending.forEach((_, n) => io.observe(n));
}

async function runLine(): Promise<void> {
  const box = document.getElementById("runmeta");
  if (!box) return;
  const o = await loadOverview();
  const render = async () => {
    const id = await currentRunId();
    const r = o.runs[id];
    const demes = new Set(r.programs.map((p) => p[2])).size;
    const last = r.steps[r.steps.length - 1];
    box.innerHTML =
      `<span class="rl">Figures below</span> ` +
      `<a class="runlink" href="${ARENA_URL}" target="_blank" rel="noopener" title="Arena record ${esc(id)}">${esc(runName(id))} ↗</a> · ` +
      `${esc(TASK_NAMES[runMeta(id).task].toLowerCase())} · ${r.programs.length} programs in ${demes} demes · ` +
      `$${last[1].toFixed(2)} · ${r.hours} h`;
  };
  onRunChange(render);
  await render();
}

initChrome();
runLine().catch((e) => console.error(e));
mountLazily();
