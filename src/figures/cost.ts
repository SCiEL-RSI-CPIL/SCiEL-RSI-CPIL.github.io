// "What the results cost": best score so far against cumulative spend (or model calls), all runs.
// Ported from legacy/assets/cost.js.

import { C, dig, el, esc, f4 } from "../lib/core";
import { loadOverview, type Overview } from "../lib/data";
import { currentRunId, onRunChange } from "../lib/run-state";
import { TASK_NAMES, runMeta, sortRuns, type TaskKey } from "../data/names";

type Mode = "cost" | "calls";

/** Gridline labels: how far the score is from the best known value. */
const GAP = ["", "within 10%", "within 1%", "within 0.1%", "within 0.01%", "best known"];

function render(o: Overview, mode: Mode, cur: string): void {
  const key = mode === "cost" ? 1 : 2;
  const fmtX = (v: number, e: number) => (mode === "cost" ? "$" + (v < 1 ? v.toFixed(-e) : v) : String(v));
  const fmtEnd = (q: number[]) => (mode === "cost" ? "$" + q[1].toFixed(2) : q[2] + " calls");
  // Shared vertical scale, one panel per task, each with its own spend range.
  const dl: number[] = [];
  for (const id of o.order) for (const q of o.runs[id].steps) if (q[3] > 0) dl.push(dig(q[3]));
  const lo = Math.max(Math.floor(Math.min(...dl)), 0.5);
  const hi = 5;
  const W = 560,
    H = 360,
    L = 92,
    Rr = 150,
    T = 18,
    B = 48;
  const Y = (d: number) => T + (1 - (Math.min(hi, Math.max(lo, d)) - lo) / (hi - lo)) * (H - T - B);
  const panel = (task: TaskKey): string => {
    const ids = sortRuns(o.order).filter((id) => runMeta(id).task === task);
    const xs = ids.flatMap((id) => o.runs[id].steps.filter((q) => q[key] > 0 && q[3] > 0).map((q) => q[key]));
    const x0 = Math.floor(Math.log10(Math.min(...xs)));
    const x1 = Math.ceil(Math.log10(Math.max(...xs)));
    const X = (v: number) => L + ((Math.log10(v) - x0) / (x1 - x0)) * (W - L - Rr);
    const s = [`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(TASK_NAMES[task])}: best score against spend">`];
    for (let g = Math.ceil(lo); g <= hi; g++) {
      s.push(
        `<line x1="${L}" x2="${W - Rr}" y1="${Y(g)}" y2="${Y(g)}" style="stroke:${g === hi ? C.ruleStrong : C.rule}"${g === hi ? ' stroke-dasharray="3 3"' : ""}/>` +
          `<text x="${L - 10}" y="${Y(g) + 4}" style="fill:${C.muted}" text-anchor="end">${GAP[g]}</text>`,
      );
    }
    for (let e = x0; e <= x1; e++) {
      const v = Math.pow(10, e);
      s.push(`<text x="${X(v)}" y="${H - B + 20}" style="fill:${C.muted}" text-anchor="middle">${fmtX(v, e)}</text>`);
    }
    // Lines, then end labels pushed apart so they never overlap.
    const ends: { y: number; x: number; id: string; text: string; color: string }[] = [];
    for (const id of ids) {
      const color = runMeta(id).color;
      const st = o.runs[id].steps.filter((q) => q[key] > 0 && q[3] > 0);
      let pb = -1;
      let d = "";
      st.forEach((q, k) => {
        const b = Math.max(pb, q[3]);
        d += (k ? "H" + X(q[key]).toFixed(1) + "V" : "M" + X(q[key]).toFixed(1) + " ") + Y(dig(b)).toFixed(1);
        pb = b;
      });
      const lq = st[st.length - 1];
      const on = id === cur;
      const ex = X(lq[key]);
      const ey = Y(dig(pb));
      s.push(
        `<path d="${d}" fill="none" stroke="${color}" stroke-width="${on ? 2.4 : 1.6}"/>` +
          `<circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="3.5" fill="${color}"/>`,
      );
      ends.push({ y: ey, x: ex, id, color, text: `${runMeta(id).letter} · ${f4(pb)} · ${fmtEnd(lq)}` });
    }
    ends.sort((a, b) => a.y - b.y);
    for (let k = 1; k < ends.length; k++) ends[k].y = Math.max(ends[k].y, ends[k - 1].y + 17);
    const lx = W - Rr + 10;
    for (const e of ends) {
      s.push(
        `<text x="${lx}" y="${(e.y + 4).toFixed(1)}" font-weight="600" fill="${e.color}">${esc(e.text.split(" · ")[0])}` +
          `<tspan font-weight="400" style="fill:${C.ink2}"> ${esc(e.text.split(" · ").slice(1).join(" · "))}</tspan></text>`,
      );
    }
    s.push(
      `<text x="${L}" y="${T - 6}" font-weight="600" style="fill:${C.ink}">${esc(TASK_NAMES[task])}</text>` +
        `<text x="${(L + W - Rr) / 2}" y="${H - 4}" style="fill:${C.muted}" text-anchor="middle">` +
        (mode === "cost" ? "model spend so far (log scale)" : "model calls so far (log scale)") +
        "</text></svg>",
    );
    return `<div class="fig">${s.join("")}</div>`;
  };
  el("cost").innerHTML = `<div class="two cost2">${panel("autocorrelation")}${panel("circles")}</div>`;
  el("costleg").innerHTML = "";
}

export async function mount(): Promise<void> {
  const o = await loadOverview();
  let mode: Mode = "cost";
  let cur = await currentRunId();
  const draw = () => render(o, mode, cur);
  const seg = el("cxm");
  seg.addEventListener("click", (e) => {
    const b = (e.target as Element).closest("button");
    if (!b) return;
    mode = b.dataset.m as Mode;
    for (const x of seg.children) x.classList.toggle("on", x === b);
    draw();
  });
  onRunChange((id) => {
    cur = id;
    draw();
  });
  draw();
}
