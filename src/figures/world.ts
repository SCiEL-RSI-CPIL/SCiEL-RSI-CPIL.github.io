// The toy landscape behind "Four ways to search", the four searchers that run on it, and the small
// canvas textures and renderer setup shared by the three.js figures (compare, niches, relief).
// Ported from legacy/assets/world.js. A library: it has no mount().

import * as THREE from "three";
import { C, cssColor } from "../lib/core";

// The legacy page used three r128, which had no colour management: hex colours went to the GPU
// unconverted, vertex-colour gradients were lerped in sRGB, and the output was not re-encoded.
// Turn r187's colour management off so the figures keep exactly those colours. Only the 3D figures
// import three, so this global setting affects nothing else.
THREE.ColorManagement.enabled = false;

/** A WebGL renderer configured like the legacy (r128) one: no output encoding, opaque clear to the page background. */
export function createRenderer(canvas: HTMLCanvasElement): THREE.WebGLRenderer {
  const rd = new THREE.WebGLRenderer({ canvas, antialias: true });
  rd.outputColorSpace = THREE.LinearSRGBColorSpace;
  rd.setPixelRatio(Math.min(devicePixelRatio, 2));
  rd.setClearColor(new THREE.Color(cssColor(C.bg)), 1);
  return rd;
}

// ---------------------------------------------------------------------------
// Toy landscape and searchers
// ---------------------------------------------------------------------------

export type Pt = [number, number];

export const G = { amp: 0.14, sig: 0.09, hole: 0.15, np: 4 };

export interface World {
  /** Score at (x, y); 0 outside the feasible set. */
  f(x: number, y: number): number;
  /** Score ignoring the constraints. */
  raw(x: number, y: number): number;
  feasible(x: number, y: number): boolean;
  seed: Pt;
  summit: Pt;
}

export function makeWorld(): World {
  const PK: [number, number, number][] = [
    [-0.4, -0.28, 0.12],
    [0.02, -0.4, 0.12],
    [-0.45, 0.2, 0.13],
    [0.3, 0.05, 0.12],
    [-0.02, 0.28, 0.12],
    [0.48, 0.36, 0.1],
    [-0.2, -0.05, 0.11],
  ];
  function raw(x: number, y: number): number {
    const dx = x - 0.72;
    const dy = y - 0.7;
    const d2 = dx * dx + dy * dy;
    let v = 0.78 * Math.exp(-d2 / (1.05 * 1.05)) - 0.08;
    for (const p of PK) {
      const e = ((x - p[0]) * (x - p[0]) + (y - p[1]) * (y - p[1])) / (p[2] * p[2]);
      v += G.amp * Math.exp(-e);
    }
    v = Math.max(v, 1.0 * Math.exp(-d2 / (0.07 * 0.07)));
    const ax = 0.5;
    const ay = 0.36;
    const ux = 0.72 - ax;
    const uy = 0.7 - ay;
    const L2 = ux * ux + uy * uy;
    const t = Math.max(0, Math.min(1, ((x - ax) * ux + (y - ay) * uy) / L2));
    const px = ax + t * ux;
    const py = ay + t * uy;
    const dd = (x - px) * (x - px) + (y - py) * (y - py);
    v = Math.max(v, (0.7 + 0.27 * t) * Math.exp(-dd / (0.035 * 0.035)));
    return Math.max(0, v);
  }
  function feasible(x: number, y: number): boolean {
    if (Math.pow(Math.abs(x) / 0.96, 4) + Math.pow(Math.abs(y) / 0.92, 4) > 1) return false;
    const hx = x - 0.08;
    const hy = y - 0.1;
    if (hx * hx + hy * hy < G.hole * G.hole) return false;
    return true;
  }
  function f(x: number, y: number): number {
    return feasible(x, y) ? raw(x, y) : 0;
  }
  return { f, raw, feasible, seed: [-0.72, -0.62], summit: [0.72, 0.7] };
}

function mkRng(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(r: () => number): number {
  const u = Math.max(1e-9, r());
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export type Mode = "bestn" | "climber" | "swarm" | "sciel";

/** Which SCiEL components are on (all default to on). */
export interface ModeOptions {
  policy?: boolean;
  world?: boolean;
  culture?: boolean;
  research?: boolean;
}

export interface PolicyState {
  /** Searcher index. */
  i: number;
  /** Current position. */
  c: Pt;
  /** Proposal spread. */
  s: number;
  /** Proposal drift. */
  mu: Pt;
}

/** One step of a search: an evaluation, a screened-out proposal, a culture move or a research probe. */
export interface SearchEvent {
  t: number;
  k: "eval" | "screen" | "chord" | "jump";
  /** Searcher index. */
  i: number;
  p: Pt;
  from: Pt;
  v: number | null;
  acc?: boolean;
  pol?: PolicyState;
}

interface Searcher {
  cur: Pt;
  val: number;
  mu: Pt;
  s: number;
  stall: number;
  best: Pt;
}

export interface SearchRun {
  ev: SearchEvent[];
  best: number;
  L?: Searcher[];
}

/** Run one searcher type for B evaluations on the toy world. Deterministic for a given seed. */
export function runMode(W: World, mode: Mode, B: number, seed: number, opt: ModeOptions = {}): SearchRun {
  const r = mkRng(seed);
  const ev: SearchEvent[] = [];
  let n = 0;
  let best = -1;
  const f = W.f;
  function evalAt(p: Pt, isl: number, from: Pt, kind: SearchEvent["k"] = "eval"): number {
    const v = f(p[0], p[1]);
    n++;
    ev.push({ t: n, k: kind, i: isl, p, from, v });
    if (v > best) best = v;
    return v;
  }
  const last = () => ev[ev.length - 1];
  const S = W.seed;
  const sig = G.sig;
  if (mode === "bestn") {
    for (let q = 0; q < B; q++) {
      const p: Pt = [S[0] + gauss(r) * 0.22, S[1] + gauss(r) * 0.22];
      evalAt(p, 0, S, "eval");
      last().acc = false;
    }
    let bi = 0;
    ev.forEach((e, i) => {
      if ((e.v as number) > (ev[bi].v as number)) bi = i;
    });
    ev[bi].acc = true;
    return { ev, best };
  }
  const m = mode === "climber" ? 1 : 5;
  const L: Searcher[] = [];
  for (let i = 0; i < m; i++) {
    const st: Pt = m === 1 ? [S[0], S[1]] : [S[0] + gauss(r) * 0.12, S[1] + gauss(r) * 0.12];
    L.push({ cur: st, val: f(st[0], st[1]), mu: [0, 0], s: sig, stall: 0, best: st });
  }
  const sci = mode === "sciel";
  const useP = sci && opt.policy !== false;
  const useW = sci && opt.world !== false;
  const useC = sci && opt.culture !== false;
  const useR = sci && opt.research !== false;
  const hist: [number, number, number][] = [];
  let turn = 0;
  let lastShare = 0;
  function predict(p: Pt, c: Pt = p): number {
    const near: [number, number, number][] = [];
    for (let j = Math.max(0, hist.length - 200); j < hist.length; j++) {
      const h = hist[j];
      const d = (h[0] - c[0]) * (h[0] - c[0]) + (h[1] - c[1]) * (h[1] - c[1]);
      if (d < 0.04 && h[2] > 0) near.push(h);
    }
    if (near.length < 5) return 0;
    let n0 = 0,
      sx = 0,
      sy = 0,
      sz = 0,
      sxx = 0,
      syy = 0,
      sxy = 0,
      sxz = 0,
      syz = 0;
    for (const h of near) {
      n0++;
      sx += h[0];
      sy += h[1];
      sz += h[2];
      sxx += h[0] * h[0];
      syy += h[1] * h[1];
      sxy += h[0] * h[1];
      sxz += h[0] * h[2];
      syz += h[1] * h[2];
    }
    const mx = sx / n0;
    const my = sy / n0;
    const mz = sz / n0;
    const cxx = sxx / n0 - mx * mx + 1e-4;
    const cyy = syy / n0 - my * my + 1e-4;
    const cxy = sxy / n0 - mx * my;
    const cxz = sxz / n0 - mx * mz;
    const cyz = syz / n0 - my * mz;
    const det = cxx * cyy - cxy * cxy;
    const bx = (cxz * cyy - cyz * cxy) / det;
    const by = (cyz * cxx - cxz * cxy) / det;
    return mz + bx * (p[0] - mx) + by * (p[1] - my);
  }
  while (n < B) {
    const i = turn % m;
    const l = L[i];
    turn++;
    if (useC && n - lastShare >= 10 && m > 1) {
      lastShare = n;
      let bj = 0;
      L.forEach((o, j) => {
        if (o.val > L[bj].val) bj = j;
      });
      let worst = 0;
      L.forEach((o, j) => {
        if (o.val < L[worst].val) worst = j;
      });
      if (worst !== bj && L[bj].val - L[worst].val > 0.04) {
        const a = L[worst];
        const b = L[bj];
        const p: Pt = [
          a.cur[0] + (b.cur[0] - a.cur[0]) * (0.75 + 0.2 * r()) + gauss(r) * 0.02,
          a.cur[1] + (b.cur[1] - a.cur[1]) * (0.75 + 0.2 * r()) + gauss(r) * 0.02,
        ];
        const v = evalAt(p, worst, b.cur, "chord");
        hist.push([p[0], p[1], v]);
        if (v > a.val) {
          a.cur = p;
          a.val = v;
          a.mu = [b.mu[0], b.mu[1]];
          a.s = b.s;
          a.stall = 0;
          last().acc = true;
        } else last().acc = false;
        if (n >= B) break;
        continue;
      }
    }
    if (useR && l.stall >= 14) {
      l.stall = 0;
      const g: Pt = [l.mu[0] || gauss(r) * 0.05, l.mu[1] || gauss(r) * 0.05];
      let bestJ: Pt | null = null;
      let bv = -1;
      for (let k2 = 0; k2 < 3; k2++) {
        const jl = 0.25 + 0.25 * r();
        const ang = Math.atan2(g[1], g[0]) + (r() - 0.5) * 1.6;
        const pj: Pt = [l.cur[0] + Math.cos(ang) * jl, l.cur[1] + Math.sin(ang) * jl];
        let pv = useW ? predict(pj, l.cur) : r();
        if (!(pv > -1e9)) pv = -1;
        if (!bestJ || pv > bv) {
          bv = pv;
          bestJ = pj;
        }
      }
      const pj = bestJ as Pt;
      const v = evalAt(pj, i, l.cur, "jump");
      hist.push([pj[0], pj[1], v]);
      if (v > l.val) {
        l.cur = pj;
        l.val = v;
        last().acc = true;
      } else last().acc = false;
      continue;
    }
    const props: Pt[] = [];
    const np = useW ? G.np : 1;
    for (let k = 0; k < np; k++) {
      const s = useP ? l.s : sig;
      props.push([l.cur[0] + (useP ? l.mu[0] : 0) + gauss(r) * s, l.cur[1] + (useP ? l.mu[1] : 0) + gauss(r) * s]);
    }
    let pick = props[0];
    if (useW) {
      let bp = -1;
      for (const p of props) {
        let v = predict(p, l.cur);
        if (!(v > -1e9)) v = -1;
        if (v > bp) {
          bp = v;
          pick = p;
        }
      }
      for (const p of props) {
        if (p !== pick) ev.push({ t: n, k: "screen", i, p, from: l.cur, v: null });
      }
    }
    const from = l.cur;
    const v = evalAt(pick, i, from, "eval");
    hist.push([pick[0], pick[1], v]);
    if (v > l.val) {
      if (useP) {
        l.mu = [0.6 * l.mu[0] + 0.4 * (pick[0] - from[0]), 0.6 * l.mu[1] + 0.4 * (pick[1] - from[1])];
        l.s = Math.min(0.12, l.s * 1.1);
      }
      l.cur = pick;
      l.val = v;
      l.stall = 0;
      last().acc = true;
    } else {
      if (useP) {
        l.s = Math.max(0.025, l.s * 0.96);
        l.mu = [l.mu[0] * 0.9, l.mu[1] * 0.9];
      }
      l.stall++;
      last().acc = false;
    }
    last().pol = { i, c: [l.cur[0], l.cur[1]], s: useP ? l.s : sig, mu: useP ? [l.mu[0], l.mu[1]] : [0, 0] };
  }
  return { ev, best, L };
}

// ---------------------------------------------------------------------------
// Canvas textures for sprites and points
// ---------------------------------------------------------------------------

function canvasTexture(draw: (g: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  if (g) draw(g);
  return new THREE.CanvasTexture(c);
}

/** Soft white radial glow (tinted by the sprite colour). */
export function glowTexture(): THREE.CanvasTexture {
  return canvasTexture((g) => {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.3, "rgba(255,255,255,.35)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  });
}

/** White disc with a page-background outline (tinted by the sprite colour). */
export function discTexture(): THREE.CanvasTexture {
  return canvasTexture((g) => {
    g.beginPath();
    g.arc(32, 32, 24, 0, 7);
    g.fillStyle = "#fff";
    g.fill();
    g.lineWidth = 5;
    g.strokeStyle = cssColor(C.bg);
    g.stroke();
  });
}

/** White ring (tinted by the sprite colour). */
export function ringTexture(): THREE.CanvasTexture {
  return canvasTexture((g) => {
    g.beginPath();
    g.arc(32, 32, 20, 0, 7);
    g.lineWidth = 7;
    g.strokeStyle = "#fff";
    g.stroke();
  });
}
