// "Inside one run": every record-setting step of an early run, one at a time. A staircase of the best
// score on top; below it a card with the step's gain, the model's own reason for the edit, and the
// code it changed (folded). Built for a phone first: tap a step or swipe the card.

import { C, el, esc } from "../lib/core";
import { loadDemo, type DemoStep } from "../lib/data";

const KIND: Record<string, string> = {
  diff: "an edit",
  full_rewrite: "a rewrite",
  cross: "a cross of two programs",
};

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
/** A small gain as "1.6 × 10⁻⁵"; a larger one to four decimals. */
function fmtGain(g: number): string {
  if (g >= 1e-4) return g.toFixed(4);
  const e = Math.floor(Math.log10(g));
  const m = (g / 10 ** e).toFixed(1);
  return `${m} × 10⁻${String(-e).split("").map((c) => SUP[+c]).join("")}`;
}

function chart(steps: DemoStep[], k: number): string {
  const W = 600,
    H = 150,
    L = 8,
    R = 8,
    T = 14,
    B = 26;
  const t0 = steps[0].it - 20;
  const t1 = steps[steps.length - 1].it + 20;
  const lo = steps[0].before;
  const hi = steps[steps.length - 1].score;
  const x = (t: number) => L + ((t - t0) / (t1 - t0)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  let d = `M${x(t0).toFixed(1)} ${y(lo).toFixed(1)}`;
  for (const s of steps) d += `H${x(s.it).toFixed(1)}V${y(s.score).toFixed(1)}`;
  d += `H${x(t1).toFixed(1)}`;
  const dots = steps
    .map((s, i) => {
      const cx = x(s.it).toFixed(1);
      const cy = y(s.score).toFixed(1);
      const on = i === k;
      return (
        `<g data-k="${i}" style="cursor:pointer"><circle cx="${cx}" cy="${cy}" r="16" fill="transparent"/>` +
        (on ? `<circle cx="${cx}" cy="${cy}" r="9" fill="none" style="stroke:${C.ink}" stroke-width="1.2"/>` : "") +
        `<circle cx="${cx}" cy="${cy}" r="${on ? 5 : 4}" style="fill:${on ? C.accent : C.panel};stroke:${C.accent}" stroke-width="1.5"/></g>`
      );
    })
    .join("");
  return (
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Best score at each record-setting step">` +
    `<line x1="${L}" x2="${W - R}" y1="${H - B + 6}" y2="${H - B + 6}" style="stroke:${C.rule}"/>` +
    `<text x="${L}" y="${H - 4}" style="fill:${C.muted}">attempt ${steps[0].it}</text>` +
    `<text x="${W - R}" y="${H - 4}" text-anchor="end" style="fill:${C.muted}">attempt ${steps[steps.length - 1].it}</text>` +
    `<path d="${d}" fill="none" style="stroke:${C.accent}" stroke-width="1.6"/>` +
    dots +
    `</svg>`
  );
}

export async function mount(): Promise<void> {
  const M = await loadDemo();
  const steps = M.steps;
  if (!steps.length) return;
  const root = el("steps");
  root.innerHTML =
    `<div class="fig stp-chart"></div>` +
    `<div class="stp-card"></div>` +
    `<div class="stp-nav"><button class="playb" type="button" data-go="-1">← Previous</button>` +
    `<span class="num"></span><button class="playb" type="button" data-go="1">Next →</button></div>`;
  const chartEl = root.querySelector<HTMLElement>(".stp-chart")!;
  const card = root.querySelector<HTMLElement>(".stp-card")!;
  const count = root.querySelector<HTMLElement>(".stp-nav .num")!;
  const prefix: Record<string, string> = { a: "+ ", r: "− ", h: "" };

  let k = 0;
  const show = (i: number) => {
    k = Math.max(0, Math.min(steps.length - 1, i));
    const s = steps[k];
    const gain = s.score - s.before;
    // Enough decimals that the two scores differ.
    let dp = 4;
    while (dp < 12 && s.before.toFixed(dp) === s.score.toFixed(dp)) dp++;
    const add = s.diff.filter(([t]) => t === "a").length;
    const del = s.diff.filter(([t]) => t === "r").length;
    chartEl.innerHTML = chart(steps, k);
    card.innerHTML =
      `<p class="stp-meta">Attempt ${s.it} · ${esc(KIND[s.op] ?? s.op)}</p>` +
      `<p class="sc-big"><span class="sc-from">${s.before.toFixed(dp)}</span><span class="sc-arrow">→</span>` +
      `<span class="sc-to" style="color:${C.accent}">${s.score.toFixed(dp)}</span></p>` +
      `<p class="stp-gain">+${fmtGain(gain)}</p>` +
      `<p class="stp-why"><span>Why the model tried it, in its own words</span>${esc(s.idea)}${/[.!?)]$/.test(s.idea.trim()) ? "" : "…"}</p>` +
      `<details class="stp-code"><summary>The code change <span class="up">+${add}</span> <span class="down">−${del}</span> lines</summary>` +
      `<pre class="diff">${s.diff.map(([t, line]) => `<span class="${t}">${esc((prefix[t] ?? "  ") + line)}</span>`).join("")}</pre></details>`;
    count.textContent = `${k + 1} of ${steps.length}`;
    root.querySelectorAll<HTMLButtonElement>("[data-go]").forEach((b) => {
      b.disabled = (b.dataset.go === "-1" && k === 0) || (b.dataset.go === "1" && k === steps.length - 1);
    });
  };

  root.addEventListener("click", (e) => {
    const t = e.target as Element;
    const go = t.closest<HTMLElement>("[data-go]");
    if (go) return show(k + +go.dataset.go!);
    const dot = t.closest<SVGGElement>("g[data-k]");
    if (dot) show(+dot.dataset.k!);
  });
  // Swipe the card left or right on a phone.
  let sx = 0;
  let sy = 0;
  card.addEventListener("touchstart", (e) => ((sx = e.touches[0].clientX), (sy = e.touches[0].clientY)), { passive: true });
  card.addEventListener(
    "touchend",
    (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > 2 * Math.abs(dy)) show(k + (dx < 0 ? 1 : -1));
    },
    { passive: true },
  );

  // Open on the biggest single gain.
  let big = 0;
  steps.forEach((s, i) => {
    if (s.score - s.before > steps[big].score - steps[big].before) big = i;
  });
  show(big);
}
