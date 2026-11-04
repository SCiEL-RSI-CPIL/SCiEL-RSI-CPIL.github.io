// How the search progresses in the selected run: the landscape along edits (child vs. parent),
// π for every run, who plans each step (the ladder), and the record staircase per deme.
// Ported from legacy/assets/progress.js.

import { C, axisY, demeColor, dig, el, esc, opName, sup } from "../lib/core";
import { loadOverview, loadRun, type Overview, type Run } from "../lib/data";
import { currentRun, onRunChange } from "../lib/run-state";
import { ARENA_URL, demeName, runName, sortRuns } from "../data/names";

const runLink = (id: string) => `<a class="xp" href="${ARENA_URL}" target="_blank" rel="noopener">${esc(runName(id))}</a>`;

/** Ticks along the attempt / step axis: every 50, or a multiple of 50 giving about eight ticks. */
function xTicks(s: string[], X: (i: number) => number, mx: number, y: number): void {
  for (let t = 0; t <= mx; t += Math.max(50, Math.round(mx / 8 / 50) * 50)) {
    s.push(`<text x="${X(t)}" y="${y}" style="fill:${C.muted}" font-size="11" text-anchor="middle">${t}</text>`);
  }
}

function editsFig(r: Run): void {
  const rows = r.edits.filter((e) => e[0] > 0 && e[1] > 0);
  const W = 620,
    H = 540,
    L = 56,
    B = 48,
    T = 14,
    Rr = 14;
  // [parent digits, child digits, deme]. The third column of an edit is the 0-based deme.
  const v = rows.map((e) => [dig(e[0]), dig(e[1]), e[2]] as const);
  const all = v.flatMap((q) => [q[0], q[1]]);
  const lo = Math.floor(Math.max(0, Math.min(...all)) * 2) / 2;
  const hi = Math.ceil(Math.max(...all) * 2) / 2;
  const X = (x: number) => L + ((x - lo) / (hi - lo)) * (W - L - Rr);
  const Y = (y: number) => T + (1 - (y - lo) / (hi - lo)) * (H - T - B);
  const above = v.filter((q) => q[1] > q[0]).length;

  let s = `<svg viewBox="0 0 ${W} ${H}">`;
  for (let g = Math.ceil(lo); g <= hi; g++) {
    s +=
      `<line x1="${L}" x2="${W - Rr}" y1="${Y(g)}" y2="${Y(g)}" style="stroke:${C.soft}"/>` +
      `<line y1="${T}" y2="${H - B}" x1="${X(g)}" x2="${X(g)}" style="stroke:${C.soft}"/>` +
      `<text x="${L - 10}" y="${Y(g) + 4}" style="fill:${C.muted}" font-size="11" text-anchor="end">${sup(g)}</text>` +
      `<text x="${X(g)}" y="${H - B + 18}" style="fill:${C.muted}" font-size="11" text-anchor="middle">${sup(g)}</text>`;
  }
  s += `<line x1="${X(lo)}" y1="${Y(lo)}" x2="${X(hi)}" y2="${Y(hi)}" style="stroke:${C.muted}" stroke-dasharray="4 4"/>`;
  v.forEach((q, k) => {
    s +=
      `<circle cx="${X(q[0]).toFixed(1)}" cy="${Y(q[1]).toFixed(1)}" r="3.8" fill="${demeColor(q[2])}" style="stroke:${C.bg}" stroke-width=".8" opacity=".9">` +
      `<title>${demeName(q[2])}: parent ${(+rows[k][0]).toFixed(5)} → child ${(+rows[k][1]).toFixed(5)}${q[1] > q[0] ? " · step up" : " · no gain"}</title></circle>`;
  });
  const my = T + (H - T - B) / 2;
  s +=
    `<text x="${L + (W - L) / 2}" y="${H - 6}" style="fill:${C.muted}" font-size="12" text-anchor="middle">parent: 1 − score</text>` +
    `<text x="16" y="${my}" style="fill:${C.muted}" font-size="12" text-anchor="middle" transform="rotate(-90 16 ${my})">child: 1 − score</text>` +
    `<text x="${L + 12}" y="${T + 20}" style="fill:${C.ink}" font-size="13" font-weight="600">` +
    `${above} of ${v.length} edits above the diagonal: π ≈ ${(above / (v.length || 1)).toFixed(2)}</text></svg>`;
  el("edits").innerHTML = s;
  el("s-edits").innerHTML =
    `In ${runLink(r.id)}, ${above} of ${v.length} edits beat their parent. ` +
    "Far from the frontier most edits help; near the best program the points crowd onto the diagonal, " +
    "which is the regime where improvements are rare and recursive improvement has to pay.";
}

/** π (share of edits that beat their parent) for every run, overall and near the frontier. */
function pis(o: Overview): void {
  const bars = sortRuns(o.order)
    .map((id) => {
      const run = o.runs[id];
      const e = run.edits.filter((q) => q[0] > 0 && q[1] > 0);
      const pi = e.filter((q) => q[1] > q[0]).length / (e.length || 1);
      const top = e.filter((q) => q[0] >= run.best - 0.01);
      const tp = top.length ? top.filter((q) => q[1] > q[0]).length / top.length : 0;
      return (
        `<span class="s">${esc(runName(id))}</span>` +
        `<div><div class="b"><i style="width:${pi * 100}%;background:${C.accent}"></i></div>` +
        `<div class="b" style="margin-top:4px"><i style="width:${tp * 100}%;background:${C.chord}"></i></div></div>` +
        `<span class="n">${pi.toFixed(2)}<br><span class="muted">${tp.toFixed(2)}</span></span>`
      );
    })
    .join("");
  el("pis").innerHTML =
    `<div class="funnel">${bars}</div>` +
    `<div class="legend"><span><i style="background:${C.accent}"></i>all edits</span><span><i style="background:${C.chord}"></i>frontier</span></div>`;
}

/** [step, "fit" | …, world-model loss, cell-means loss, base-rate loss, _, policy] */
type SwmRow = [number, string, number | null, number | null, number | null, unknown, string | null];

function ladder(r: Run): void {
  const st = r.engine.steps;
  const sw = r.engine.swm as SwmRow[];
  const W = 1160,
    H = 320,
    L = 60,
    Rr = 20,
    T = 14,
    mid = 92,
    B = 36;
  const mx = st[st.length - 1][0] || 1;
  const X = (i: number) => L + (i / mx) * (W - L - Rr);
  // Planner colours: bandits, world model, RL policy.
  const col: Record<string, string> = { base: C.ruleStrong, swm: C.accent, rl: C.up };
  const s = [`<svg viewBox="0 0 ${W} ${H}">`];
  s.push(`<text x="${L - 10}" y="${T + 26}" style="fill:${C.muted}" font-size="11" text-anchor="end">planner</text>`);
  for (const q of st) {
    const c = q[5].planner ? q[5].planner[0] : null;
    if (!c) continue;
    s.push(
      `<rect x="${(X(q[0]) - 1.2).toFixed(1)}" y="${T + (c === "base" ? 18 : c === "swm" ? 8 : 0)}" width="2.4" height="${c === "base" ? 14 : 24}" style="fill:${col[c] || C.ruleStrong}"/>`,
    );
  }
  const vals = sw.flatMap((q) => [q[2], q[3], q[4]]).filter((v): v is number => v != null);
  if (vals.length) {
    const lo = Math.min(...vals);
    const hi = Math.min(Math.max(...vals), lo + 1.2);
    const Y = (v: number) => mid + ((Math.min(v, hi) - lo) / (hi - lo || 1)) * (H - mid - B);
    for (let g = 0; g <= 3; g++) {
      const v = lo + ((hi - lo) * g) / 3;
      s.push(
        `<line x1="${L}" x2="${W - Rr}" y1="${Y(v)}" y2="${Y(v)}" style="stroke:${C.soft}"/>` +
          `<text x="${L - 10}" y="${Y(v) + 4}" style="fill:${C.muted}" font-size="11" text-anchor="end">${v.toFixed(2)}</text>`,
      );
    }
    let ds = "";
    let dr = "";
    sw.forEach((q, k) => {
      const ref = Math.min(q[3] != null ? q[3] : 9, q[4] != null ? q[4] : 9);
      ds += `${k ? "L" : "M"}${X(q[0]).toFixed(1)} ${Y(q[2] as number).toFixed(1)}`;
      dr += `${k ? "L" : "M"}${X(q[0]).toFixed(1)} ${Y(ref).toFixed(1)}`;
    });
    s.push(
      `<path d="${dr}" fill="none" style="stroke:${C.muted}" stroke-width="1.4" stroke-dasharray="4 4"/>` +
        `<path d="${ds}" fill="none" style="stroke:${C.accent}" stroke-width="1.8"/>`,
    );
    const f3 = (x: number | null) => (x != null ? x.toFixed(3) : "—");
    for (const q of sw) {
      const ok = q[1] === "fit" && !!q[6] && q[6] !== "None";
      s.push(
        `<circle cx="${X(q[0]).toFixed(1)}" cy="${Y(q[2] as number).toFixed(1)}" r="4.5" style="fill:${ok ? C.accent : C.bg};stroke:${C.accent}" stroke-width="1.5">` +
          `<title>step ${q[0]}: world model ${f3(q[2])}, cell means ${f3(q[3])}, base rate ${f3(q[4])} · ${ok ? "acts" : "held back"}</title></circle>`,
      );
    }
    s.push(`<text x="${L}" y="${mid - 10}" style="fill:${C.muted}" font-size="11">log loss, lower is better (top)</text>`);
  }
  xTicks(s, X, mx, H - 8);
  s.push("</svg>");
  el("ladder").innerHTML = s.join("");

  const count: Record<string, number> = {};
  for (const q of st) {
    const k = q[5].planner ? q[5].planner[0] : "none";
    count[k] = (count[k] || 0) + 1;
  }
  const fits = sw.filter((q) => q[1] === "fit").length;
  el("s-ladder").innerHTML =
    `In ${runLink(r.id)} the bandits planned ${count.base || 0} steps and the world model ${count.swm || 0}` +
    `${count.rl ? `, the RL policy ${count.rl}` : ""}; the world model passed its check at ${fits} of ${sw.length} refits.`;
}

/** Best score so far, per deme and for the population, against attempt. */
function chart(r: Run): void {
  // [attempt, deme, score]
  const P = r.programs
    .filter((p) => p[4] != null && p[4] > 0)
    .map((p) => [p[6] || 0, p[2], p[4] as number] as const)
    .sort((a, b) => a[0] - b[0]);
  const W = 1160,
    H = 300,
    L = 60,
    Rr = 20,
    T = 14,
    B = 34;
  const maxIt = Math.max(...P.map((p) => p[0])) || 1;
  const demes = new Map<number, { best: number; pts: [number, number][] }>();
  const pop: [number, number][] = [];
  let pb = -1;
  const vals = P.map((p) => dig(p[2])).sort((a, b) => a - b);
  const lo = Math.floor(vals[Math.floor(vals.length * 0.1)] * 2) / 2;
  const hi = Math.ceil(dig(r.best) * 4) / 4;
  for (const [it, deme, score] of P) {
    let b = demes.get(deme);
    if (!b) demes.set(deme, (b = { best: -1, pts: [] }));
    if (score > b.best) {
      b.best = score;
      b.pts.push([it, score]);
    }
    if (score > pb) {
      pb = score;
      pop.push([it, pb]);
    }
  }
  // Legacy iterated demes in object-key order, i.e. ascending.
  const demeIds = [...demes.keys()].sort((a, b) => a - b);
  const X = (i: number) => L + (i / maxIt) * (W - L - Rr);
  const Y = (d: number) => T + (1 - (Math.max(lo, d) - lo) / (hi - lo || 1)) * (H - T - B);
  const step = (pts: [number, number][]) => {
    let d = `M${X(pts[0][0])} ${Y(dig(pts[0][1]))}`;
    for (let k = 1; k < pts.length; k++) d += `H${X(pts[k][0])}V${Y(dig(pts[k][1]))}`;
    return d + `H${X(maxIt)}`;
  };

  const s = [`<svg viewBox="0 0 ${W} ${H}">`];
  axisY(s, L, W, Rr, Y, lo, hi);
  xTicks(s, X, maxIt, H - 8);
  for (const k of demeIds) {
    s.push(`<path d="${step(demes.get(k)!.pts)}" fill="none" stroke="${demeColor(k)}" stroke-width="1.4" opacity=".85"/>`);
  }
  s.push(`<path d="${step(pop)}" fill="none" style="stroke:${C.ink}" stroke-width="2"/></svg>`);
  el("chart").innerHTML = s.join("");
  el("chartleg").innerHTML =
    `<span><i class="ln" style="background:${C.ink}"></i>population</span>` +
    demeIds.map((k) => `<span><i class="ln" style="background:${demeColor(k)}"></i>${demeName(k)}</span>`).join("");

  const who = new Set<number>();
  const ops: Record<string, number> = {};
  for (const c of r.chain) {
    who.add(c.island);
    ops[c.op] = (ops[c.op] || 0) + 1;
  }
  const topop = Object.keys(ops).sort((a, b) => ops[b] - ops[a])[0];
  el("s-steps").innerHTML =
    `In ${runLink(r.id)} the best program changed ${r.chain.length} times, on ${who.size} of ${demes.size} demes. ` +
    `The other demes supply parents and material; the most common record move is ${opName(topop)} (${ops[topop]} of ${r.chain.length}).`;
}

function show(r: Run): void {
  editsFig(r);
  ladder(r);
  chart(r);
}

export async function mount(): Promise<void> {
  pis(await loadOverview());
  show(await currentRun());
  onRunChange(async (id) => show(await loadRun(id)));
}
