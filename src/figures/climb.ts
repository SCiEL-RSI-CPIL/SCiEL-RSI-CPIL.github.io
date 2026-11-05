// "Four ways to climb": one trial of each search method on the toy landscape, animated side by side.
// Each card is a top-down topographic map (thin grey contour lines, hatched where solutions are
// invalid). Baselines are drawn in grey, SCiEL in the accent colour, culture moves in red.

import { C, el, esc, isVisible, prefersReducedMotion } from "../lib/core";
import { makeWorld, runMode, type Mode, type Pt, type SearchEvent, type SearchRun, type World } from "./toy";

const BUDGET = 200;
const S = 300; // map size in SVG units
const SUMMIT = 0.95;
const GREY = "#8A8A90";
const PANELS: [Mode, string][] = [
  ["bestn", "One model"],
  ["climber", "One climber"],
  ["swarm", "Five climbers"],
  ["sciel", "SCiEL"],
];

const xs = (x: number) => ((x + 1) / 2) * S;
const ys = (y: number) => (1 - (y + 1) / 2) * S;
const X = (p: Pt) => xs(p[0]).toFixed(1);
const Y = (p: Pt) => ys(p[1]).toFixed(1);

/** Contour lines of the landscape by marching squares, one path per level, as an SVG fragment. */
function contours(W: World): string {
  const N = 110;
  const g: number[][] = [];
  for (let j = 0; j <= N; j++) {
    g.push([]);
    for (let i = 0; i <= N; i++) g[j].push(W.raw(-1 + (2 * i) / N, -1 + (2 * j) / N));
  }
  const P = (i: number, j: number) => `${xs(-1 + (2 * i) / N).toFixed(1)} ${ys(-1 + (2 * j) / N).toFixed(1)}`;
  const out: string[] = [];
  [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].forEach((lv, li) => {
    let d = "";
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const pts: string[] = [];
        const cut = (v0: number, v1: number, i0: number, j0: number, i1: number, j1: number) => {
          if (v0 < lv !== v1 < lv) {
            const t = (lv - v0) / (v1 - v0);
            pts.push(P(i0 + (i1 - i0) * t, j0 + (j1 - j0) * t));
          }
        };
        const a = g[j][i];
        const b = g[j][i + 1];
        const c = g[j + 1][i + 1];
        const e = g[j + 1][i];
        cut(a, b, i, j, i + 1, j);
        cut(b, c, i + 1, j, i + 1, j + 1);
        cut(c, e, i + 1, j + 1, i, j + 1);
        cut(e, a, i, j + 1, i, j);
        if (pts.length >= 2) d += `M${pts[0]}L${pts[1]}`;
        if (pts.length === 4) d += `M${pts[2]}L${pts[3]}`;
      }
    }
    const shade = Math.round(214 - li * 10);
    out.push(`<path d="${d}" fill="none" stroke="rgb(${shade},${shade},${shade + 2})" stroke-width=".7"/>`);
  });
  return out.join("");
}

/** Invalid regions as a hatched image (a data URL): diagonal lines, cleared where solutions are valid. */
function hatch(W: World): string {
  const N = 300;
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const g = cv.getContext("2d");
  if (!g) return "";
  g.strokeStyle = "rgb(205,205,202)";
  g.lineWidth = 1;
  for (let k = -N; k < N; k += 7) {
    g.beginPath();
    g.moveTo(k, N);
    g.lineTo(k + N, 0);
    g.stroke();
  }
  const img = g.getImageData(0, 0, N, N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++)
      if (W.feasible(-1 + (2 * (i + 0.5)) / N, 1 - (2 * (j + 0.5)) / N)) img.data[4 * (j * N + i) + 3] = 0;
  g.putImageData(img, 0, 0);
  return cv.toDataURL();
}

/** A trial in which SCiEL reaches the summit and the three baselines do not (the typical case in Figure 6). */
function pickTrial(W: World): Record<Mode, SearchRun> {
  let out: Record<Mode, SearchRun> | null = null;
  for (let seed = 500; seed < 530; seed++) {
    const runs = Object.fromEntries(PANELS.map(([m]) => [m, runMode(W, m, BUDGET, seed)])) as Record<Mode, SearchRun>;
    out ??= runs;
    if (runs.sciel.best > SUMMIT && PANELS.slice(0, 3).every(([m]) => runs[m].best <= SUMMIT)) return runs;
  }
  return out as Record<Mode, SearchRun>;
}

function marks(mode: Mode, evs: SearchEvent[], t: number): { svg: string; best: number } {
  const col = mode === "sciel" ? C.accent : GREY;
  const lines: string[] = [];
  const dots: string[] = [];
  const head: Record<number, Pt> = {};
  let best = 0;
  let bestP: Pt | null = null;
  for (const e of evs) {
    if (e.t > t) break;
    if (e.v != null && e.v > best) {
      best = e.v;
      bestP = e.p;
    }
    if (e.k === "screen") continue;
    if (mode === "bestn") {
      dots.push(`<circle cx="${X(e.p)}" cy="${Y(e.p)}" r="1.6" style="fill:${GREY}" opacity=".55"/>`);
      continue;
    }
    if (!e.acc) continue;
    const stroke =
      e.k === "chord"
        ? `style="stroke:${C.chord}" stroke-width="1.8"`
        : e.k === "jump"
          ? `style="stroke:${col}" stroke-width="1.2" stroke-dasharray="3 3"`
          : `style="stroke:${col}" stroke-width="1.4"`;
    lines.push(`<line x1="${X(e.from)}" y1="${Y(e.from)}" x2="${X(e.p)}" y2="${Y(e.p)}" ${stroke} stroke-linecap="round"/>`);
    head[e.i] = e.p;
  }
  const dot = (p: Pt) => `<circle cx="${X(p)}" cy="${Y(p)}" r="3.6" style="fill:${col}" stroke="#fff" stroke-width="1.2"/>`;
  const heads = mode === "bestn" ? (bestP ? dot(bestP) : "") : Object.values(head).map(dot).join("");
  return { svg: dots.join("") + lines.join("") + heads, best };
}

export function mount(): void {
  const W = makeWorld();
  const runs = pickTrial(W);
  const base = `<image href="${hatch(W)}" x="0" y="0" width="${S}" height="${S}" preserveAspectRatio="none"/>` + contours(W);
  const root = el("climb");
  root.innerHTML = PANELS.map(
    ([m, name]) =>
      `<div class="cl-card${m === "sciel" ? " em" : ""}"><p class="cl-name">${esc(name)}</p>` +
      `<svg viewBox="0 0 ${S} ${S}" role="img" aria-label="${esc(name)} on the toy landscape">${base}` +
      `<g data-m="${m}"></g>` +
      `<circle cx="${X(W.seed)}" cy="${Y(W.seed)}" r="3.5" style="fill:${C.ink}"/>` +
      `<text x="${+X(W.seed) + 8}" y="${+Y(W.seed) + 14}" style="fill:${C.muted}">start</text>` +
      `<path d="M${X(W.summit)} ${+Y(W.summit) - 7}l6 10.5h-12z" fill="none" style="stroke:${C.ink}" stroke-width="1.3"/>` +
      `<text x="${+X(W.summit) - 10}" y="${+Y(W.summit) - 10}" text-anchor="end" style="fill:${C.muted}">summit</text>` +
      `</svg><p class="cl-num" data-b="${m}"></p></div>`,
  ).join("");

  const range = el<HTMLInputElement>("climbT");
  const label = el("climbTv");
  const btn = el<HTMLButtonElement>("climbPlay");
  let shown = -1;
  const draw = (t: number) => {
    t = Math.round(t);
    if (t === shown) return;
    shown = t;
    for (const [m] of PANELS) {
      const { svg, best } = marks(m, runs[m].ev, t);
      (root.querySelector(`g[data-m="${m}"]`) as SVGGElement).innerHTML = svg;
      (root.querySelector(`[data-b="${m}"]`) as HTMLElement).innerHTML =
        `<b>${best.toFixed(2)}</b><span>${best > SUMMIT ? "reached the summit" : "best score"}</span>`;
    }
    range.value = String(t);
    label.textContent = `evaluation ${t} of ${BUDGET}`;
  };

  // Playback: about 20 evaluations a second, a pause at the end, then again from the start.
  let playing = !prefersReducedMotion();
  let t = playing ? 0 : BUDGET;
  let hold = 0;
  let last = 0;
  const setBtn = () => (btn.textContent = playing ? "Pause" : "Play");
  btn.addEventListener("click", () => {
    playing = !playing;
    if (playing && t >= BUDGET) t = 0;
    setBtn();
  });
  range.addEventListener("input", () => {
    playing = false;
    setBtn();
    t = +range.value;
    draw(t);
  });
  const frame = (now: number) => {
    requestAnimationFrame(frame);
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (!playing || !isVisible(root)) return;
    if (t >= BUDGET) {
      hold += dt;
      if (hold < 2.5) return;
      hold = 0;
      t = 0;
    }
    t = Math.min(BUDGET, t + dt * 20);
    draw(t);
  };
  setBtn();
  draw(t);
  requestAnimationFrame(frame);
}
