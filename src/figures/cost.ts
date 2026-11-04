// "What the results cost": best score so far against cumulative spend (or model calls), all runs.
// Ported from legacy/assets/cost.js.

import { C, axisY, dig, el, esc, f4 } from "../lib/core";
import { loadOverview, type Overview } from "../lib/data";
import { currentRunId, onRunChange } from "../lib/run-state";
import { runMeta, runName, sortRuns } from "../data/names";

type Mode = "cost" | "calls";

function render(o: Overview, mode: Mode, cur: string): void {
  const W = 1160,
    H = 380,
    L = 84,
    Rr = 20,
    T = 14,
    B = 40;
  const key = mode === "cost" ? 1 : 2;
  const all: number[] = [];
  const dl: number[] = [];
  for (const id of o.order) {
    for (const s of o.runs[id].steps) {
      if (s[key] > 0 && s[3] > 0) {
        all.push(s[key]);
        dl.push(dig(s[3]));
      }
    }
  }
  const x0 = Math.floor(Math.log10(Math.min(...all)));
  const x1 = Math.ceil(Math.log10(Math.max(...all)));
  const lo = Math.max(Math.floor(Math.min(...dl) * 2) / 2, 0.5);
  const hi = Math.ceil(Math.max(...dl) * 2) / 2;
  const X = (v: number) => L + ((Math.log10(v) - x0) / (x1 - x0)) * (W - L - Rr);
  const Y = (d: number) => T + (1 - (Math.max(lo, d) - lo) / (hi - lo)) * (H - T - B);

  const s = [`<svg viewBox="0 0 ${W} ${H}">`];
  axisY(s, L, W, Rr, Y, lo, hi);
  for (let e = x0; e <= x1; e++) {
    const v = Math.pow(10, e);
    s.push(
      `<line y1="${T}" y2="${H - B}" x1="${X(v)}" x2="${X(v)}" style="stroke:${C.soft}"/>` +
        `<text x="${X(v)}" y="${H - B + 20}" style="fill:${C.muted}" font-size="11" text-anchor="middle">` +
        (mode === "cost" ? "$" + (v < 1 ? v.toFixed(-e) : v) : v) +
        "</text>",
    );
  }
  for (const id of sortRuns(o.order)) {
    const color = runMeta(id).color;
    const name = esc(runName(id));
    const st = o.runs[id].steps.filter((q) => q[key] > 0 && q[3] > 0);
    let pb = -1;
    let d = "";
    st.forEach((q, k) => {
      const b = Math.max(pb, q[3]);
      d += (k ? "H" + X(q[key]).toFixed(1) + "V" : "M" + X(q[key]).toFixed(1) + " ") + Y(dig(b)).toFixed(1);
      pb = b;
    });
    const lq = st[st.length - 1];
    if (pb > 1) {
      s.push(
        `<text x="${X(lq[key]) - 8}" y="${Y(5) + 14}" fill="${color}" font-size="11" text-anchor="end">above the best known value</text>`,
      );
    }
    const on = id === cur;
    s.push(
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${on ? 2.6 : 1.4}" opacity="${on ? 1 : 0.7}">` +
        `<title>${name}: best ${f4(pb)} for $${lq[1].toFixed(2)} and ${lq[2]} model calls</title></path>` +
        `<circle cx="${X(lq[key]).toFixed(1)}" cy="${Y(dig(pb)).toFixed(1)}" r="3.5" fill="${color}">` +
        `<title>${name}: best ${f4(pb)} · $${lq[1].toFixed(2)} · ${lq[2]} calls</title></circle>`,
    );
  }
  s.push(
    `<text x="${W - Rr}" y="${H - 6}" style="fill:${C.muted}" font-size="11" text-anchor="end">` +
      (mode === "cost" ? "cumulative model spend, log scale" : "model calls, log scale") +
      "</text></svg>",
  );
  el("cost").innerHTML = s.join("");
  el("costleg").innerHTML = sortRuns(o.order)
    .map((id) => {
      const st = o.runs[id].steps;
      return `<span><i class="ln" style="background:${runMeta(id).color}"></i>${esc(runName(id))} · $${st[st.length - 1][1].toFixed(2)}</span>`;
    })
    .join("");
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
