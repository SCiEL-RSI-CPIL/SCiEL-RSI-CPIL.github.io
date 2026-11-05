// Figure 2 (How SCiEL works). Tapping one of the four steps opens a small working demo of it below:
//   1 Choose          the policy draws a kind of edit from its odds; kinds that pay off get likelier.
//   2 Screen          proposals arrive with the world model's forecast; those under a threshold are skipped.
//   3 Write and test  a real edit from Figure 3 is written out, then scored by the checker.
//   4 Keep and log    rows of a real run's log, each choice with the odds it was drawn at.
// Demos 1 and 2 are illustrations with made-up odds; 3 and 4 replay real data.

import { C, OP_COLORS, el, esc, isVisible, prefersReducedMotion } from "../lib/core";
import { loadDemo, loadOverview, loadRun, programsById } from "../lib/data";

type Stop = () => void;
const still = prefersReducedMotion();

/** setInterval that only ticks while the panel is on screen. */
function every(panel: HTMLElement, ms: number, f: () => void): Stop {
  const h = setInterval(() => {
    if (isVisible(panel)) f();
  }, ms);
  return () => clearInterval(h);
}

/** A small seeded random generator, so demo 2 shows the same proposals every time. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------------------------------------
// 1 · Choose
// ---------------------------------------------------------------------------------------------
function choose(panel: HTMLElement): Stop {
  const KINDS = [
    { k: "diff", name: "small edit", p: 0.55 },
    { k: "full_rewrite", name: "rewrite", p: 0.15 },
    { k: "cross", name: "cross of two programs", p: 0.35 },
  ];
  panel.innerHTML =
    `<p class="fwp-say">The policy draws the kind of edit from its odds. Each time a kind pays off, it gets likelier.</p>` +
    `<div class="fwp-odds">${KINDS.map(
      (x, i) =>
        `<div class="fwp-row" data-i="${i}"><span class="l">${esc(x.name)}</span>` +
        `<span class="t"><i style="background:${OP_COLORS[x.k]}"></i></span><span class="v"></span></div>`,
    ).join("")}</div>` +
    `<p class="fwp-log">&nbsp;</p>` +
    `<div class="fwp-ctl"><button class="playb" type="button" data-a="draw">Draw one</button>` +
    `<button class="playb" type="button" data-a="reset">Start over</button></div>`;
  const rows = [...panel.querySelectorAll<HTMLElement>(".fwp-row")];
  const log = panel.querySelector<HTMLElement>(".fwp-log")!;
  let tries = [0, 0, 0];
  let wins = [0, 0, 0];
  let n = 0;
  const odds = () => {
    const w = KINDS.map((_, i) => ((wins[i] + 1) / (tries[i] + 2)) ** 1.5);
    const t = w.reduce((a, b) => a + b, 0);
    return w.map((x) => x / t);
  };
  const paint = (hi = -1) => {
    const o = odds();
    rows.forEach((r, i) => {
      r.querySelector<HTMLElement>("i")!.style.width = (o[i] * 100).toFixed(1) + "%";
      r.querySelector<HTMLElement>(".v")!.textContent = Math.round(o[i] * 100) + "%";
      r.classList.toggle("hi", i === hi);
    });
  };
  const draw = () => {
    const o = odds();
    let u = Math.random();
    let i = 0;
    while (i < 2 && u > o[i]) u -= o[i++];
    const ok = Math.random() < KINDS[i].p;
    tries[i]++;
    if (ok) wins[i]++;
    n++;
    log.innerHTML =
      `Edit ${n}: a <b>${esc(KINDS[i].name)}</b> (drawn at ${Math.round(o[i] * 100)}%) ` +
      (ok ? `<span class="up">beat its parent</span>.` : `was no better.`) + " Its odds now:";
    paint(i);
  };
  const reset = () => {
    tries = [0, 0, 0];
    wins = [0, 0, 0];
    n = 0;
    log.innerHTML = "Every kind starts with even odds.";
    paint();
  };
  let auto = !still;
  panel.querySelector('[data-a="draw"]')!.addEventListener("click", () => ((auto = false), draw()));
  panel.querySelector('[data-a="reset"]')!.addEventListener("click", () => ((auto = false), reset()));
  reset();
  return every(panel, 1100, () => {
    if (!auto) return;
    if (n >= 40) reset();
    else draw();
  });
}

// ---------------------------------------------------------------------------------------------
// 2 · Screen
// ---------------------------------------------------------------------------------------------
function screen(panel: HTMLElement): Stop {
  const r = rng(7);
  const P = Array.from({ length: 24 }, () => {
    const p = 0.05 + 0.85 * r();
    return { p, good: r() < p * 0.8 };
  });
  panel.innerHTML =
    `<p class="fwp-say">Each proposed edit arrives with the world model's forecast that it will beat its parent. ` +
    `Below the threshold it is skipped, which saves an evaluation.</p>` +
    `<div class="fwp-chips"></div>` +
    `<label class="fwp-thr">Skip below <b></b><input class="rng" type="range" min="0" max="80" step="5" value="30" aria-label="Threshold"></label>` +
    `<p class="fwp-log"></p>` +
    `<p class="fwp-key"><span><i class="c ok"></i>evaluated, beat its parent</span><span><i class="c no"></i>evaluated, no better</span><span><i class="c sk"></i>skipped</span></p>`;
  const box = panel.querySelector<HTMLElement>(".fwp-chips")!;
  const range = panel.querySelector<HTMLInputElement>("input")!;
  const thrLab = panel.querySelector<HTMLElement>(".fwp-thr b")!;
  const log = panel.querySelector<HTMLElement>(".fwp-log")!;
  let shown = still ? P.length : 0;
  const paint = () => {
    const thr = +range.value / 100;
    thrLab.textContent = range.value + "%";
    const vis = P.slice(0, shown);
    box.innerHTML = vis
      .map((x) => {
        const cls = x.p < thr ? "sk" : x.good ? "ok" : "no";
        return `<span class="c ${cls}" title="forecast ${Math.round(x.p * 100)}%">${Math.round(x.p * 100)}</span>`;
      })
      .join("");
    const sk = vis.filter((x) => x.p < thr);
    const ev = vis.filter((x) => x.p >= thr);
    log.innerHTML =
      `Skipped <b>${sk.length}</b> (evaluations saved) · evaluated ${ev.length}, of which ` +
      `<span class="up">${ev.filter((x) => x.good).length} improved</span> · good edits missed: ${sk.filter((x) => x.good).length}`;
  };
  range.addEventListener("input", paint);
  paint();
  let hold = 0;
  return every(panel, 450, () => {
    if (still) return;
    if (shown < P.length) shown++;
    else if (++hold > 8) ((hold = 0), (shown = 0));
    paint();
  });
}

// ---------------------------------------------------------------------------------------------
// 3 · Write and test (the biggest gain in Figure 3)
// ---------------------------------------------------------------------------------------------
function write(panel: HTMLElement): Stop {
  panel.innerHTML = `<p class="fwp-say">The language model rewrites part of the parent; the checker then scores the new program.</p><pre class="diff fwp-code"></pre><p class="fwp-log">&nbsp;</p><div class="fwp-ctl"><button class="playb" type="button">Replay</button></div>`;
  const pre = panel.querySelector<HTMLElement>("pre")!;
  const log = panel.querySelector<HTMLElement>(".fwp-log")!;
  let timer = 0;
  const stop: Stop = () => clearInterval(timer);
  loadDemo().then((M) => {
    let big = M.steps[0];
    for (const s of M.steps) if (s.score - s.before > big.score - big.before) big = s;
    // In that edit the old nested-loop min_area goes and a vectorised one comes in.
    const d = big.diff;
    const at = Math.max(0, d.findIndex(([, l]) => l.includes("def min_area")));
    const firstAdd = d.findIndex(([k], i) => i > at && k === "a");
    const ctx = d.slice(at, at + 3).map(([, l]) => l);
    const del = d.slice(at, firstAdd).filter(([k]) => k === "r");
    const add: string[] = [];
    for (let i = firstAdd; i < d.length && d[i][0] === "a" && add.length < 13; i++) add.push(d[i][1]);
    const total = add.reduce((a, t) => a + t.length + 1, 0);
    const line = (cls: string, t: string) => `<span class="${cls}">${esc(t)}</span>`;
    const head = ctx.map((t) => line("c", "  " + t)).join("");
    const gone = line("r", `− … ${del.length} lines of nested loops removed`);
    const run = () => {
      stop();
      let phase = 0;
      let chars = 0;
      log.innerHTML = "&nbsp;";
      const tick = () => {
        if (phase === 0) {
          pre.innerHTML = head + del.slice(0, 6).map(([, t]) => line("r", "− " + t)).join("");
          phase = 1;
        } else if (phase === 1) {
          pre.innerHTML = head + gone;
          phase = 2;
        } else if (phase === 2) {
          chars = Math.min(total, chars + (still ? total : 60));
          let left = chars;
          const typed = add
            .map((t) => {
              if (left <= 0) return "";
              const s = t.slice(0, left);
              left -= t.length + 1;
              return line("a", "+ " + s);
            })
            .join("");
          pre.innerHTML = head + gone + typed;
          if (chars >= total) phase = 3;
        } else if (phase === 3) {
          log.innerHTML =
            `Checker: score ${big.before.toFixed(4)} → <b style="color:${C.accent}">${big.score.toFixed(4)}</b> ` +
            `<span class="up">✓ beats its parent</span>`;
          phase = 4;
          stop();
        }
      };
      if (still) {
        while (phase < 4) tick();
        return;
      }
      tick();
      timer = window.setInterval(tick, 300);
    };
    panel.querySelector("button")!.addEventListener("click", run);
    run();
  });
  return stop;
}

// ---------------------------------------------------------------------------------------------
// 4 · Keep and log (the first steps of the run in Figure 1)
// ---------------------------------------------------------------------------------------------
const KIND_NAME: Record<string, string> = {
  diff: "small edit",
  full_rewrite: "rewrite",
  cross: "cross",
  idea: "new idea",
  error_repair: "repair",
};

function keep(panel: HTMLElement): Stop {
  panel.innerHTML =
    `<p class="fwp-say">A better program joins the deme, and every choice goes into the log with the odds it was drawn at. ` +
    `Those odds are what let <a href="#culture">Section 4</a> test culture like a randomised trial.</p>` +
    `<div class="fwp-keep"><svg class="fwp-deme" viewBox="0 0 120 120" aria-hidden="true"></svg>` +
    `<div class="fwp-tab"><div class="fwp-tr th"><span>step</span><span>edit kind</span><span>odds</span><span>result</span></div>` +
    `<div class="fwp-body"></div></div></div>`;
  const body = panel.querySelector<HTMLElement>(".fwp-body")!;
  const deme = panel.querySelector<SVGElement>(".fwp-deme")!;
  let alive = true;
  let inner: Stop = () => {};
  (async () => {
    const o = await loadOverview();
    const r = await loadRun(o.order[0]);
    if (!alive) return;
    const by = programsById(r);
    const byAttempt = new Map(r.programs.filter((p) => p[1]).map((p) => [p[6], p]));
    type Row = { step: number; kind: string; p: number; up: boolean };
    const rows: Row[] = [];
    for (const s of r.engine.steps) {
      const op = s[5]?.operator;
      const child = byAttempt.get(s[0]);
      // Only the kinds the policy draws between; new ideas and repairs come from elsewhere.
      if (!op || !child || !(op[0] in KIND_NAME) || op[0] === "idea" || op[0] === "error_repair") continue;
      const parent = child[1] ? by.get(child[1]) : undefined;
      const up = parent?.[4] != null && child[4] != null && child[4] > parent[4];
      rows.push({ step: s[0], kind: KIND_NAME[op[0]] ?? op[0], p: op[1][op[0]] ?? 0, up });
    }
    // Skip the opening steps, where every kind still has even odds.
    const from = Math.max(0, rows.findIndex((x) => x.step >= 15));
    let k = from;
    let dots: [number, number][] = [];
    const paintDeme = (ring: boolean) => {
      deme.innerHTML =
        `<circle cx="60" cy="60" r="56" fill="none" style="stroke:${C.rule}"/>` +
        dots
          .map(
            ([x, y], i) =>
              `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="#D0702F"/>` +
              (ring && i === dots.length - 1
                ? `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" fill="none" style="stroke:${C.ink}" stroke-width="1.3"/>`
                : ""),
          )
          .join("");
    };
    const add = () => {
      if (k >= from + 14 || k >= rows.length) {
        k = from;
        dots = [];
        body.innerHTML = "";
      }
      const x = rows[k++];
      const tr = document.createElement("div");
      tr.className = "fwp-tr";
      tr.innerHTML =
        `<span>${x.step}</span><span>${esc(x.kind)}</span><span>${Math.round(x.p * 100)}%</span>` +
        `<span>${x.up ? '<b class="up">kept</b>' : "not better"}</span>`;
      body.appendChild(tr);
      while (body.children.length > 6) body.firstElementChild!.remove();
      if (x.up) {
        const a = dots.length * 2.4;
        const rr = 12 + dots.length * 3.6;
        dots.push([60 + rr * Math.cos(a), 60 + rr * Math.sin(a)]);
      }
      paintDeme(x.up);
    };
    if (!rows.length) return;
    if (still) {
      for (let i = 0; i < 6; i++) add();
      return;
    }
    add();
    inner = every(panel, 1100, add);
  })();
  return () => {
    alive = false;
    inner();
  };
}

const DEMOS = [choose, screen, write, keep];

export function mount(): void {
  const root = el("fw");
  const panel = el("fw-panel");
  const steps = [...root.querySelectorAll<HTMLElement>(".fw-steps li")];
  let stop: Stop = () => {};
  const open = (i: number) => {
    stop();
    steps.forEach((s, j) => s.classList.toggle("on", j === i));
    stop = DEMOS[i](panel);
  };
  steps.forEach((s, i) => {
    s.addEventListener("click", () => open(i));
    s.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(i);
      }
    });
  });
  open(0);
  // The culture arcs draw once when the figure comes into view.
  root
    .querySelectorAll<SVGPathElement>(".fw-arc")
    .forEach((a) => a.style.setProperty("--len", String(Math.ceil(a.getTotalLength()))));
  if (!still) root.classList.add("send");
}
