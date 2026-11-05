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
  const cards = sortRuns(o.order).map((id) => {
    const run = o.runs[id];
    const e = run.edits.filter((q) => q[0] > 0 && q[1] > 0);
    const all = e.filter((q) => q[1] > q[0]).length / (e.length || 1);
    const top = e.filter((q) => q[0] >= run.best - NEAR);
    const near = top.length ? top.filter((q) => q[1] > q[0]).length / top.length : 0;
    const bar = (v: number, c: string) => `<div class="mini-bar"><i style="width:${(v * 100).toFixed(1)}%;background:${c}"></i></div>`;
    return (
      `<div class="stat-card"><p class="sc-name">${esc(runName(id))}</p>` +
      `<p class="sc-big"><span class="sc-from">${pct(all)}</span><span class="sc-arrow">→</span>` +
      `<span class="sc-to" style="color:${C.accent}">${pct(near)}</span></p>` +
      bar(all, C.ruleStrong) +
      bar(near, C.accent) +
      `</div>`
    );
  });
  el("edits").innerHTML =
    `<div class="stat-cards three">${cards.join("")}</div>` +
    `<div class="hb"><p class="hb-key" style="margin:12px 0 0"><span><i style="background:${C.ruleStrong}"></i>all edits</span>` +
    `<span><i style="background:${C.accent}"></i>edits starting near the run's best</span></p></div>`;
}
