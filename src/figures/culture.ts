// "Does culture raise the odds?" (the randomized test across runs) and the research-cell funnel
// of the selected run. Ported from legacy/assets/culture.js.

import { C, el, esc } from "../lib/core";
import { loadOverview, loadRun, type Run } from "../lib/data";
import { currentRun, onRunChange } from "../lib/run-state";
import { ARENA_URL, runName } from "../data/names";

/** [with a finding, without, 95% low, 95% high] (low/high are of the difference). */
type Effect = [number, number, number, number];

interface CultureTest {
  n: number;
  runs: number;
  out: { y: Effect; ev: Effect };
  /** [label, with, without, 95% low, 95% high, steps] */
  phases: [string, number, number, number, number, number][];
  /** [label, difference, steps] */
  per_run: [string, number, number][];
}

interface Research {
  cells: number;
  decisions: number;
  phases?: Record<string, number>;
  statuses?: Record<string, number>;
  conclusions?: Record<string, number>;
  actions?: Record<string, number>;
}

const pc = (v: number) => `${Math.round(v * 100)}%`;
const pp = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)}`;

function lead(cu: CultureTest): void {
  const { y, ev } = cu.out;
  el("s-ct").innerHTML =
    "Each time a deme builds a prompt, SCiEL decides at random, with a logged probability, whether to include a finding from another deme. " +
    "That makes the effect of culture estimable from the system’s own logs, without bias. " +
    `Across <a class="xp" href="${ARENA_URL}" target="_blank" rel="noopener">${cu.runs} runs</a> and ${cu.n.toLocaleString("en")} such decisions, ` +
    `a delivered finding raised the chance that the child beats its parent from ${pc(y[1])} to ${pc(y[0])} ` +
    `(${pp(y[0] - y[1])} points, 95% interval ${pp(y[2])} to ${pp(y[3])}), ` +
    `and the chance of a new deme record from ${pc(ev[1])} to ${pc(ev[0])}. ` +
    "The effect is largest early in a run, when demes have the most to learn from each other.";
}

/** Panel A: with vs. without a finding, for the two outcomes. */
function dumbbells(cu: CultureTest): void {
  const W = 560,
    H = 300,
    L = 150,
    Rr = 150,
    T = 40,
    x0 = 0.3,
    x1 = 0.7;
  const X = (v: number) => L + ((v - x0) / (x1 - x0)) * (W - L - Rr);
  const s = [`<svg viewBox="0 0 ${W} ${H}">`];
  for (let g = 0.3; g <= 0.701; g += 0.1) {
    s.push(
      `<line x1="${X(g)}" x2="${X(g)}" y1="${T - 14}" y2="${H - 36}" style="stroke:${C.soft}"/>` +
        `<text x="${X(g)}" y="${H - 16}" style="fill:${C.muted}" font-size="11" text-anchor="middle">${Math.round(g * 100)}%</text>`,
    );
  }
  const rows: [string, Effect][] = [
    ["child beats its parent", cu.out.y],
    ["new deme record", cu.out.ev],
  ];
  rows.forEach(([name, v], i) => {
    const yy = T + 40 + i * 100;
    s.push(
      `<text x="${L - 16}" y="${yy + 4}" style="fill:${C.ink}" font-size="13" text-anchor="end">${name}</text>`,
      `<line x1="${X(v[1])}" x2="${X(v[0])}" y1="${yy}" y2="${yy}" style="stroke:${C.ruleStrong}" stroke-width="3"/>`,
      `<circle cx="${X(v[1])}" cy="${yy}" r="7" style="fill:${C.faint}"><title>without a finding: ${pc(v[1])}</title></circle>` +
        `<circle cx="${X(v[0])}" cy="${yy}" r="8" style="fill:${C.chord}"><title>with a finding from another deme: ${pc(v[0])}</title></circle>`,
      `<text x="${X(v[1])}" y="${yy - 14}" style="fill:${C.muted}" font-size="11" text-anchor="middle">${pc(v[1])}</text>` +
        `<text x="${X(v[0])}" y="${yy - 14}" style="fill:${C.chord}" font-size="12" font-weight="600" text-anchor="middle">${pc(v[0])}</text>`,
      `<text x="${W - Rr + 18}" y="${yy - 2}" style="fill:${C.ink}" font-size="13" font-weight="600">${pp(v[0] - v[1])} pts</text>` +
        `<text x="${W - Rr + 18}" y="${yy + 15}" style="fill:${C.muted}" font-size="11">95%: ${pp(v[2])} to ${pp(v[3])}</text>`,
    );
  });
  s.push(
    `<g font-size="11"><circle cx="${L}" cy="14" r="5" style="fill:${C.faint}"/>` +
      `<text x="${L + 10}" y="18" style="fill:${C.muted}">no finding</text>` +
      `<circle cx="${L + 96}" cy="14" r="5" style="fill:${C.chord}"/>` +
      `<text x="${L + 106}" y="18" style="fill:${C.muted}">finding from another deme</text></g></svg>`,
  );
  el("ctA").innerHTML = s.join("");
}

/** Panel B: the difference by phase of the run, overall, and per run. */
function forest(cu: CultureTest): void {
  const { y } = cu.out;
  const W = 560,
    H = 300,
    L = 130,
    Rr = 24,
    T = 24,
    d0 = -0.4,
    d1 = 0.45;
  const X = (v: number) => L + ((Math.max(d0, Math.min(d1, v)) - d0) / (d1 - d0)) * (W - L - Rr);
  const t = [`<svg viewBox="0 0 ${W} ${H}">`];
  for (const g of [-0.4, -0.2, 0, 0.2, 0.4]) {
    const zero = g === 0;
    t.push(
      `<line x1="${X(g)}" x2="${X(g)}" y1="${T}" y2="${H - 36}" style="stroke:${zero ? C.faint : C.soft}"${zero ? ' stroke-dasharray="4 4"' : ""}/>` +
        `<text x="${X(g)}" y="${H - 16}" style="fill:${C.muted}" font-size="11" text-anchor="middle">${g > 0 ? "+" : ""}${Math.round(g * 100)}</text>`,
    );
  }
  t.push(`<text x="${W - Rr}" y="${H - 2}" style="fill:${C.muted}" font-size="11" text-anchor="end">difference, points</text>`);
  // [label, difference, low, high, steps]
  const rows: [string, number, number, number, number][] = cu.phases.map((p) => [p[0], p[1] - p[2], p[3], p[4], p[5]]);
  rows.push(["all steps", y[0] - y[1], y[2], y[3], cu.n]);
  rows.forEach(([name, d, lo, hi, n], i) => {
    const yy = T + 28 + i * 44;
    const last = i === rows.length - 1;
    t.push(
      `<text x="${L - 14}" y="${yy + 4}" style="fill:${last ? C.ink : C.ink2}" font-size="12.5" font-weight="${last ? 600 : 400}" text-anchor="end">${name}</text>`,
      `<line x1="${X(lo)}" x2="${X(hi)}" y1="${yy}" y2="${yy}" style="stroke:${C.chord}" stroke-width="2" opacity=".7"/>` +
        `<rect x="${X(d) - 5}" y="${yy - 5}" width="10" height="10" style="fill:${C.chord}">` +
        `<title>${name}: ${pp(d)} points, 95% ${pp(lo)} to ${pp(hi)}, ${n} steps</title></rect>`,
    );
  });
  const yr = T + 28 + rows.length * 44;
  t.push(`<text x="${L - 14}" y="${yr + 4}" style="fill:${C.ink2}" font-size="12.5" text-anchor="end">each run</text>`);
  cu.per_run.forEach(([name, d, n], i) => {
    const jit = (((i * 37) % 11) - 5) * 1.6;
    t.push(
      `<circle cx="${X(d).toFixed(1)}" cy="${(yr + jit).toFixed(1)}" r="${(2.5 + Math.sqrt(n) / 2.2).toFixed(1)}" style="fill:${C.muted}" opacity=".55">` +
        `<title>${esc(name)}: ${pp(d)} points over ${n} steps</title></circle>`,
    );
  });
  t.push("</svg>");
  el("ctB").innerHTML = t.join("");
}

const STAGE_TIPS: Record<string, string> = {
  "cells opened": "standing questions opened by demes",
  "experiments planned": "model steps that planned an experiment for a cell",
  "tools written": "experiments that produced an executable tool",
  "concluded supported or refuted": "steps that reached a verdict on their question",
  "findings shared": "conclusions shared with other demes",
  "adopted for trials": "shared findings other demes took on trial",
  "reached a child on another deme": "a finding delivered into a child prompt on another deme",
  "child improved": "that child beat its parent",
};

function funnel(r: Run): void {
  const x = r.engine.research as Research;
  const ph = x.phases || {};
  const st = x.statuses || {};
  const co = x.conclusions || {};
  const ac = x.actions || {};
  if (!x.cells) {
    el("funnel").innerHTML = '<span class="s">Research cells were off in this run.</span><span></span><span></span>';
    el("s-funnel").innerHTML = "Circle packing ran without research cells; pick an autocorrelation run to see the funnel.";
    return;
  }
  const rose = r.transfers.filter((t) => t.rose).length;
  const verdicts = (co.supported || 0) + (co.refuted || 0);
  const rows: [string, number, string][] = [
    ["cells opened", x.cells, C.ruleStrong],
    ["experiments planned", x.decisions, C.ruleStrong],
    ["tools written", ac.create || 0, C.accent],
    ["concluded supported or refuted", verdicts, "#6E5BB5"],
    ["findings shared", ph.sharing_completed || 0, C.up],
    ["adopted for trials", st.adopted_for_trials || 0, C.up],
    ["reached a child on another deme", r.transfers.length, C.chord],
    ["child improved", rose, C.chord],
  ];
  const mx = rows[0][1] || 1;
  el("funnel").innerHTML = rows
    .map(
      ([name, n, color]) =>
        `<span class="s" title="${STAGE_TIPS[name]}">${name}</span>` +
        `<div class="b"><i style="width:${Math.max(n ? 1.5 : 0, (n / mx) * 100)}%;background:${color}"></i></div>` +
        `<span class="n">${n}</span>`,
    )
    .join("");

  el("s-funnel").innerHTML =
    "A research cell is a standing question an individual keeps open. Each step plans an experiment, writes a tool, runs it in a sandbox and concludes; " +
    `what survives is shared and tried by others. In ${esc(runName(r.id))} ${x.cells} cells planned ${x.decisions} experiments ` +
    `and wrote ${ac.create || 0} tools; ${verdicts} experiments reached a verdict, ` +
    `and ${st.adopted_for_trials || 0} findings were adopted for trials by other demes.`;
}

export async function mount(): Promise<void> {
  const o = await loadOverview();
  const cu = o.culture as CultureTest;
  lead(cu);
  dumbbells(cu);
  forest(cu);
  funnel(await currentRun());
  onRunChange(async (id) => funnel(await loadRun(id)));
}
