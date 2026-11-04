// The static part of "Four ways to search": four viewports onto one toy landscape (terrain,
// contours, seed and summit markers) and the HTML labels that float over them.
// Ported from legacy/assets/compare-scene.js; the searchers are drawn by compare.ts.

import * as THREE from "three";
import { C, cssColor, el } from "../lib/core";
import { demeName } from "../data/names";
import { createRenderer, discTexture, glowTexture, ringTexture, type Mode, type Pt, type World } from "./world";

/** A label in viewport `pi`, positioned each frame by projecting `p`. */
export interface MLabel {
  pi: number;
  el: HTMLDivElement;
  p: THREE.Vector3;
  on: boolean;
  /** Cached label width (px); reset to 0 when the text changes. */
  w?: number;
}

export interface Spherical {
  t: number;
  p: number;
  r: number;
}

export const MCOL0 = ["#3A6EA5", "#D0702F", "#3F8F5C", "#A63D3D", "#6E5BB5"];
export const MODES: [Mode, string][] = [
  ["bestn", "One call · best of N"],
  ["climber", "One climber"],
  ["swarm", "Swarm"],
  ["sciel", "SCiEL"],
];

export function mechanismScene(WD: World) {
  const wrap = el("mech3d");
  const cv = el<HTMLCanvasElement>("cmech");
  const ovm = el("ovmech");
  const cols = () => ((wrap.clientWidth || 1400) < 900 ? 2 : 4);
  const dim = { MW: 0, PW: 0, PH: 0, MH: 0 };
  function size() {
    dim.MW = wrap.clientWidth || 1400;
    const c = cols();
    dim.PW = dim.MW / c;
    dim.PH = Math.round(dim.PW * 0.92);
    dim.MH = dim.PH * (4 / c);
  }
  size();
  const bg = cssColor(C.bg);
  const rd = createRenderer(cv);
  rd.setSize(dim.MW, dim.MH, false);
  rd.setScissorTest(true);
  const sc = new THREE.Scene();
  sc.fog = new THREE.Fog(bg, 140, 300);
  const cam = new THREE.PerspectiveCamera(34, dim.PW / dim.PH, 0.1, 600);
  const XL = 84;
  const YL = 18;
  const tg = new THREE.Vector3(0, 4, 0);
  const sp: Spherical = { t: -0.45, p: 0.9, r: (wrap.clientWidth || 1400) < 600 ? 180 : 158 };
  const gl: Spherical = { t: sp.t, p: sp.p, r: sp.r };
  function plc() {
    cam.position.set(
      tg.x + sp.r * Math.sin(sp.p) * Math.sin(sp.t),
      tg.y + sp.r * Math.cos(sp.p),
      tg.z + sp.r * Math.sin(sp.p) * Math.cos(sp.t),
    );
    cam.lookAt(tg);
  }
  const X = (x: number) => (x * XL) / 2;
  const Z = (y: number) => (-y * XL) / 2;
  const Hh = (v: number) => v * YL;
  const at = (p: Pt, lift?: number) => new THREE.Vector3(X(p[0]), Hh(WD.f(p[0], p[1])) + (lift || 0.35), Z(p[1]));

  ovm.innerHTML = "";
  const panels = MODES.map((m) => {
    const d = document.createElement("div");
    d.className = "mpanel";
    d.innerHTML = `<div class="mt">${m[1]}</div><div class="mb"></div>`;
    ovm.appendChild(d);
    return d;
  });
  function layout() {
    const c = cols();
    panels.forEach((d, i) => {
      d.style.left = `${(i % c) * dim.PW}px`;
      d.style.top = `${Math.floor(i / c) * dim.PH}px`;
      d.style.width = `${dim.PW}px`;
      d.style.height = `${dim.PH}px`;
    });
  }
  layout();
  addEventListener("resize", () => {
    size();
    rd.setSize(dim.MW, dim.MH, false);
    cam.aspect = dim.PW / dim.PH;
    cam.updateProjectionMatrix();
    layout();
  });

  const MLAB: MLabel[] = [];
  function mlab(pi: number, text: string, cls: string, color: string): MLabel {
    const e = document.createElement("div");
    e.className = `l3 ${cls}`;
    e.textContent = text;
    e.style.color = color;
    ovm.appendChild(e);
    const L: MLabel = { pi, el: e, p: new THREE.Vector3(), on: true };
    MLAB.push(L);
    return L;
  }

  // Terrain: a height field, banded in colour; infeasible ground is flat and dark.
  const N = 130;
  const pos: number[] = [];
  const col: number[] = [];
  const ix: number[] = [];
  const vals: number[] = [];
  const LOW = new THREE.Color("#F1F3F7");
  const HIGH = new THREE.Color("#2F5597");
  const OFF = new THREE.Color("#E4E4E2");
  for (let j = 0; j <= N; j++)
    for (let i = 0; i <= N; i++) {
      const x = -1 + (2 * i) / N;
      const y = -1 + (2 * j) / N;
      const ok = WD.feasible(x, y);
      const v = WD.f(x, y);
      vals.push(ok ? v : -1);
      const c = ok ? LOW.clone().lerp(HIGH, Math.pow(Math.floor(v * 14) / 14, 1.15)) : OFF;
      pos.push(X(x), ok ? Hh(v) : 0, Z(y));
      col.push(c.r, c.g, c.b);
    }
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const a = j * (N + 1) + i;
      ix.push(a, a + 1, a + N + 1, a + 1, a + N + 2, a + N + 1);
    }
  const tg2 = new THREE.BufferGeometry();
  tg2.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  tg2.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  tg2.setIndex(ix);
  sc.add(new THREE.Mesh(tg2, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })));

  // Marching squares over the grid, drawn flat at height `lift`.
  function march(levelFn: (k: number) => number, lv: number, lift: number, color: number, op: number) {
    const out: number[] = [];
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const a0 = j * (N + 1) + i;
        const ids = [a0, a0 + 1, a0 + N + 2, a0 + N + 1];
        const cs: Pt[] = [
          [i, j],
          [i + 1, j],
          [i + 1, j + 1],
          [i, j + 1],
        ];
        const vs = ids.map(levelFn);
        const pts: Pt[] = [];
        for (let e = 0; e < 4; e++) {
          const v0 = vs[e];
          const v1 = vs[(e + 1) % 4];
          if (v0 < lv !== v1 < lv) {
            const f = (lv - v0) / (v1 - v0);
            const p0 = cs[e];
            const p1 = cs[(e + 1) % 4];
            pts.push([-1 + (2 * (p0[0] + (p1[0] - p0[0]) * f)) / N, -1 + (2 * (p0[1] + (p1[1] - p0[1]) * f)) / N]);
          }
        }
        for (let q = 0; q + 1 < pts.length; q += 2) {
          const A = pts[q];
          const Bq = pts[q + 1];
          out.push(X(A[0]), lift, Z(A[1]), X(Bq[0]), lift, Z(Bq[1]));
        }
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(out, 3));
    sc.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: op })));
  }
  for (const lv of [0.2, 0.4, 0.6, 0.8]) march((k) => vals[k], lv, Hh(lv) + 0.08, 0x6f8fbf, 0.28);
  march((k) => (vals[k] >= 0 ? 1 : 0), 0.5, 0.25, 0x1a9bb5, 0.95);

  const glowT = glowTexture();
  const discT = discTexture();
  const ringT = ringTexture();
  const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: new THREE.Color(cssColor(C.ink)), transparent: true, opacity: 0.15, depthWrite: false }));
  sm.position.copy(at(WD.summit, 0.8));
  sm.scale.set(11, 11, 1);
  sc.add(sm);
  const sd = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: discT, color: new THREE.Color(cssColor(C.ink)), transparent: true, depthWrite: false }),
  );
  sd.position.copy(at(WD.seed, 0.6));
  sd.scale.set(2.2, 2.2, 1);
  sc.add(sd);

  for (const pi of [0, 1, 2, 3]) {
    mlab(pi, "seed", "mlab", C.ink2).p.copy(at(WD.seed, 3));
    mlab(pi, "best known", "mlab", C.ink).p.copy(at(WD.summit, 5));
  }
  mlab(0, "feasible set F", "mlab land", "#1A9BB5").p.copy(at([-0.9, 0.62], 1.5));
  mlab(0, "constraint: no solutions here", "mlab land", "#1A9BB5").p.copy(new THREE.Vector3(X(0.08), 1.6, Z(0.1)));
  mlab(0, "local bump: a trap", "mlab land", "#6F8FBF").p.copy(at([0.02, -0.4], 2.4));
  mlab(0, "narrow ridge to the summit", "mlab land", "#6F8FBF").p.copy(at([0.6, 0.52], 2.6));
  const heads5 = [0, 1, 2, 3, 4];
  const DL = {
    bestn: { best: mlab(0, "best sample", "mlab", C.ink) },
    climber: { head: mlab(1, "climber", "mlab", C.ink) },
    swarm: { heads: heads5.map((i) => mlab(2, `climber ${i + 1}`, "mlab sm", MCOL0[i])) },
    sciel: {
      heads: heads5.map((i) => mlab(3, demeName(i), "mlab sm", MCOL0[i])),
      chord: mlab(3, "culture: moved to the leader", "mlab", "#A63D3D"),
      screen: mlab(3, "screened before evaluation", "mlab opt", C.muted),
      jump: mlab(3, "research probe", "mlab", "#6E5BB5"),
      policy: mlab(3, "policy: where to propose next", "mlab opt", C.ink2),
    },
  };
  return { wrap, cv, ovm, rd, sc, cam, XL, sp, gl, dim, cols, plc, at, panels, MLAB, discT, ringT, DL };
}
