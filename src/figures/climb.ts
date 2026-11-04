// "Four ways to climb": one trial of each search method on the toy landscape, animated side by side.
// A flat, top-down replacement for the old 3D figure. Each panel is a contour map (darker = higher
// score, grey = invalid solutions); lines are accepted steps, dots are tries that were rejected.

import { C, DEME_COLORS, el, esc, isVisible, prefersReducedMotion } from "../lib/core";
import { makeWorld, runMode, type Mode, type Pt, type SearchEvent, type SearchRun, type World } from "./toy";

const BUDGET = 200;
const S = 300; // panel size in SVG units
const SUMMIT = 0.95;
const PANELS: [Mode, string][] = [
  ["bestn", "One model"],
  ["climber", "One climber"],
  ["swarm", "Five climbers"],
  ["sciel", "SCiEL"],
];

const X = (p: Pt) => (((p[0] + 1) / 2) * S).toFixed(1);
const Y = (p: Pt) => ((1 - (p[1] + 1) / 2) * S).toFixed(1);

/** The landscape as a banded contour image (a data URL), shared by all four panels. */
function landscape(W: World): string {
  const N = 150;
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const g = cv.getContext("2d");
  if (!g) return "";
  const img = g.createImageData(N, N);
  const lo = [247, 248, 251];
  const hi = [118, 148, 196];
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = -1 + (2 * (i + 0.5)) / N;
      const y = 1 - (2 * (j + 0.5)) / N;
      const k = 4 * (j * N + i);
      let rgb: number[];
      if (!W.feasible(x, y)) rgb = [232, 232, 229];
      else {
        const band = Math.min(1, Math.floor(W.f(x, y) * 8) / 8);
        rgb = lo.map((a, c) => Math.round(a + (hi[c] - a) * band));
      }
      img.data[k] = rgb[0];
      img.data[k + 1] = rgb[1];
      img.data[k + 2] = rgb[2];
      img.data[k + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv.toDataURL();
}

/** A trial in which SCiEL reaches the summit and the three baselines do not (the typical case in Figure 4). */
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
    const col = DEME_COLORS[e.i % DEME_COLORS.length];
    if (e.k === "screen") continue;
    if (mode === "bestn") {
      dots.push(`<circle cx="${X(e.p)}" cy="${Y(e.p)}" r="2" fill="${col}" opacity=".45"/>`);
      continue;
    }
    if (e.acc) {
      const stroke =
        e.k === "chord"
          ? `style="stroke:${C.chord}" stroke-width="2.2"`
          : e.k === "jump"
            ? `style="stroke:${C.ink2}" stroke-width="1.4" stroke-dasharray="3 3"`
            : `stroke="${col}" stroke-width="1.8"`;
      lines.push(`<line x1="${X(e.from)}" y1="${Y(e.from)}" x2="${X(e.p)}" y2="${Y(e.p)}" ${stroke} stroke-linecap="round"/>`);
      head[e.i] = e.p;
    } else {
      dots.push(`<circle cx="${X(e.p)}" cy="${Y(e.p)}" r="1.6" style="fill:${C.muted}" opacity=".35"/>`);
    }
  }
  let heads = "";
  if (mode === "bestn") {
    if (bestP) heads = `<circle cx="${X(bestP)}" cy="${Y(bestP)}" r="5" fill="${DEME_COLORS[0]}" stroke="#fff" stroke-width="1.5"/>`;
  } else {
    for (const [i, p] of Object.entries(head)) {
      heads += `<circle cx="${X(p)}" cy="${Y(p)}" r="5" fill="${DEME_COLORS[+i % DEME_COLORS.length]}" stroke="#fff" stroke-width="1.5"/>`;
    }
  }
  return { svg: dots.join("") + lines.join("") + heads, best };
}

export function mount(): void {
  const W = makeWorld();
  const runs = pickTrial(W);
  const bg = landscape(W);
  const root = el("climb");
  root.innerHTML = PANELS.map(
    ([m, name]) =>
      `<div class="cl-panel"><p class="cl-name${m === "sciel" ? " em" : ""}">${esc(name)}</p>` +
      `<svg viewBox="0 0 ${S} ${S}" role="img" aria-label="${esc(name)} on the toy landscape">` +
      `<image href="${bg}" x="0" y="0" width="${S}" height="${S}" preserveAspectRatio="none"/>` +
      `<g data-m="${m}"></g>` +
      `<circle cx="${X(W.seed)}" cy="${Y(W.seed)}" r="4" style="fill:${C.ink}"/>` +
      `<text x="${+X(W.seed) + 8}" y="${+Y(W.seed) + 14}" style="fill:${C.ink2}">start</text>` +
      `<circle cx="${X(W.summit)}" cy="${Y(W.summit)}" r="7" fill="none" style="stroke:${C.ink}" stroke-width="1.5"/>` +
      `<text x="${+X(W.summit) - 10}" y="${+Y(W.summit) - 12}" text-anchor="end" style="fill:${C.ink2}">summit</text>` +
      `</svg><p class="cl-best" data-b="${m}"></p></div>`,
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
        `best ${best.toFixed(2)}` + (best > SUMMIT ? ` · <b style="color:${C.up}">reached the summit</b>` : "");
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
