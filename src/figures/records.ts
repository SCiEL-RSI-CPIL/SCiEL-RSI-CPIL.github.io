// "Records come in steps", continued: the record table and diff viewer from a demo run, the small
// multiples of best-so-far for every run, and the "Open questions" lead.
// Ported from legacy/assets/records.js.

import { C, OP_COLORS, el, esc, f4, opName } from "../lib/core";
import { loadDemo, loadOverview, type Demo, type Overview } from "../lib/data";
import { ARENA_URL, runName, sortRuns } from "../data/names";

const opColor = (op: string) => OP_COLORS[op] || "#8C8C8C";

function demo(M: Demo): void {
  if (!M || !M.steps.length) return;
  el("demonote").textContent =
    `Diffs from an early run on the ${M.task} (best ${M.best.toFixed(4)}); the code of the runs above stays private.`;
  const table = el("recs");
  table.innerHTML = M.steps
    .map(
      (c, k) =>
        `<tr class="pick" data-k="${k}"><td class="num">${c.it}</td><td class="num">${(+c.score).toFixed(5)}</td>` +
        `<td><span class="tag dot" style="--fc:${opColor(c.op)}">${esc(opName(c.op))}</span></td>` +
        `<td class="idea">${esc(c.idea.slice(0, 140))}${c.idea.length > 140 ? "…" : ""}</td></tr>`,
    )
    .join("");
  const rows = [...table.children] as HTMLElement[];
  const prefix: Record<string, string> = { a: "+ ", r: "- ", h: "" };
  const pick = (k: number) => {
    const c = M.steps[k];
    rows.forEach((x, i) => x.classList.toggle("sel", i === k));
    el("dtitle").innerHTML =
      `<b>Attempt ${c.it}</b> <span class="muted">· ${(+c.before).toFixed(5)} → ` +
      `<span class="up">${(+c.score).toFixed(5)}</span> · ${esc(opName(c.op))}</span>`;
    el("diff").innerHTML = c.diff.map(([kind, line]) => `<span class="${kind}">${esc((prefix[kind] ?? "  ") + line)}</span>`).join("");
  };
  rows.forEach((tr) => (tr.onclick = () => pick(+(tr.dataset.k ?? 0))));
  // Open on the biggest single gain.
  let big = 0;
  M.steps.forEach((c, k) => {
    if (c.score - c.before > M.steps[big].score - M.steps[big].before) big = k;
  });
  pick(big);
}

/** One small best-so-far chart per run, with every scored program dotted by operator. */
function multiples(o: Overview): void {
  const W = 360,
    H = 160,
    L = 8,
    T = 8,
    B = 22;
  el("multi").innerHTML = sortRuns(o.order)
    .map((id) => {
      const r = o.runs[id];
      // [attempt, score, operator]
      const P = r.programs
        .filter((p) => (p[4] ?? 0) > 0)
        .map((p) => [p[6] || 0, p[4] as number, p[7]] as const)
        .sort((a, b) => a[0] - b[0]);
      const maxIt = P[P.length - 1][0] || 1;
      let pb = -1;
      const pts: [number, number][] = [];
      for (const p of P) {
        if (p[1] > pb) {
          pb = p[1];
          pts.push([p[0], pb]);
        }
      }
      const lo = Math.min(pts[0][1], r.best - 0.05);
      const hi = r.best;
      const X = (i: number) => L + (i / maxIt) * (W - 2 * L);
      const Y = (v: number) => T + (1 - (Math.max(lo, v) - lo) / (hi - lo)) * (H - T - B);
      let d = `M${X(pts[0][0])} ${Y(pts[0][1])}`;
      for (const q of pts) d += `H${X(q[0])}V${Y(q[1])}`;
      d += `H${X(maxIt)}`;
      const dots = P.map((p) =>
        p[1] > lo ? `<circle cx="${X(p[0]).toFixed(1)}" cy="${Y(p[1]).toFixed(1)}" r="1.4" fill="${opColor(p[2])}" opacity=".55"/>` : "",
      ).join("");
      return (
        `<div><p class="t"><b><a class="xp" href="${ARENA_URL}" target="_blank" rel="noopener">${esc(runName(id))}</a></b> · best ${f4(r.best)}</p>` +
        `<svg viewBox="0 0 ${W} ${H}"><line x1="${L}" x2="${W - L}" y1="${H - B}" y2="${H - B}" style="stroke:${C.rule}"/>` +
        dots +
        `<path d="${d}" fill="none" style="stroke:${C.ink}" stroke-width="1.6"/>` +
        `<text x="${L}" y="${H - 5}" style="fill:${C.muted}" font-size="10">0</text>` +
        `<text x="${W - L}" y="${H - 5}" style="fill:${C.muted}" font-size="10" text-anchor="end">${maxIt} attempts</text></svg></div>`
      );
    })
    .join("");
}

export async function mount(): Promise<void> {
  const [M, o] = await Promise.all([loadDemo(), loadOverview()]);
  demo(M);
  multiples(o);
}
