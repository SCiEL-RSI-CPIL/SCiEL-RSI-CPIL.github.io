// "Improvements get rarer near the top": for each run, the share of edits that beat their parent,
// over all edits and for edits whose parent was already close to the run's best.

import { C, el, esc } from "../lib/core";
import { loadOverview } from "../lib/data";
import { runName, sortRuns } from "../data/names";

/** "Near the top": the parent is within this much of the run's best score. */
const NEAR = 0.01;

export async function mount(): Promise<void> {
  const o = await loadOverview();
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  // Bars share their row with the value label, so 100% maps to 85% of the row.
  const w = (v: number) => `${(v * 85).toFixed(1)}%`;
  const html = [
    '<div class="hb">',
    `<p class="hb-key"><span><i style="background:${C.ruleStrong}"></i>all edits</span>` +
      `<span><i style="background:${C.accent}"></i>edits starting near the run's best</span></p>`,
  ];
  for (const id of sortRuns(o.order)) {
    const run = o.runs[id];
    const e = run.edits.filter((q) => q[0] > 0 && q[1] > 0);
    const all = e.filter((q) => q[1] > q[0]).length / (e.length || 1);
    const top = e.filter((q) => q[0] >= run.best - NEAR);
    const near = top.length ? top.filter((q) => q[1] > q[0]).length / top.length : 0;
    html.push(
      `<div class="hb-row"><span class="l">${esc(runName(id))}</span><div class="hb-pair">` +
        `<div><i style="width:${w(all)};background:${C.ruleStrong}"></i><em style="color:var(--muted)">${pct(all)}</em></div>` +
        `<div><i style="width:${w(near)};background:${C.accent}"></i><em style="color:var(--ink);font-weight:600">${pct(near)}</em></div>` +
        `</div><span></span></div>`,
    );
  }
  el("edits").innerHTML = html.join("") + "</div>";
}
