// "Does culture help?": the randomised test. Each time a prompt is built, SCiEL decides at random
// (with a logged probability) whether to include a finding from another deme; this compares the
// outcomes with and without it, across runs.

import { C, el } from "../lib/core";
import { loadOverview } from "../lib/data";

/** [with a finding, without, 95% low, 95% high] (low/high are of the difference). */
type Effect = [number, number, number, number];

interface CultureTest {
  n: number;
  runs: number;
  out: { y: Effect; ev: Effect };
}

const pc = (v: number) => `${Math.round(v * 100)}%`;
const pp = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)}`;

export async function mount(): Promise<void> {
  const cu = (await loadOverview()).culture as CultureTest;
  const x0 = 0.3;
  const x1 = 0.7;
  const X = (v: number) => (((v - x0) / (x1 - x0)) * 100).toFixed(2) + "%";
  const rows: [string, Effect][] = [
    ["The edit beats its parent", cu.out.y],
    ["The edit sets a new record", cu.out.ev],
  ];
  const html = [
    '<div class="hb">',
    `<p class="hb-key"><span><i class="dot" style="background:${C.faint}"></i>without a finding</span>` +
      `<span><i class="dot" style="background:${C.chord}"></i>with a finding from another deme</span></p>`,
  ];
  for (const [name, v] of rows) {
    html.push(
      `<div class="hb-row"><span class="l">${name}</span><div class="hb-dots">` +
        `<span class="seg-line" style="left:${X(v[1])};width:calc(${X(v[0])} - ${X(v[1])})"></span>` +
        `<span class="d" style="left:${X(v[1])};background:${C.faint}"></span>` +
        `<span class="d" style="left:${X(v[0])};background:${C.chord}"></span>` +
        `<span class="t" style="left:${X(v[1])};color:var(--muted)">${pc(v[1])}</span>` +
        `<span class="t" style="left:${X(v[0])};color:${C.chord};font-weight:600">${pc(v[0])}</span>` +
        `</div><span class="v"><b>${pp(v[0] - v[1])}</b> pts</span></div>`,
    );
  }
  const ticks = [0.3, 0.4, 0.5, 0.6, 0.7].map((g) => `<span style="left:${X(g)}">${Math.round(g * 100)}%</span>`).join("");
  html.push(`<div class="hb-axis"><div style="border:0"></div><div>${ticks}</div><div style="border:0"></div></div></div>`);
  el("ctest").innerHTML = html.join("");
}
