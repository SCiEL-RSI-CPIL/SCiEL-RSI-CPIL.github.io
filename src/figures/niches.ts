// "Where the long shots live": the learned niches (an SVG map of the VQ codebook), the summary
// sentence and machinery cards, and the per-deme MAP-Elites grids over time (three.js).
// Ported from legacy/assets/niches.js. Root: #niche3d.

import * as THREE from "three";
import { C, cssColor, demeColor, el, isVisible, prefersReducedMotion } from "../lib/core";
import { loadOverview, type Overview } from "../lib/data";
import { placeTip } from "../lib/tooltip";
import { ARENA_URL, demeName, runName } from "../data/names";
import { createRenderer } from "./world";

/** [niche (codebook centroid), score bin, best score in the cell] */
type NicheCell = [niche: number, bin: number, score: number];

/** One deme's MAP-Elites archive. `idx` is the 0-based deme index. */
interface NicheIsland {
  idx: number;
  grid: NicheCell[];
  best: number;
  n: number;
}

/** [attempt, archives at that attempt] */
type Snapshot = [attempt: number, islands: NicheIsland[]];

interface Niches {
  final: NicheIsland[];
  snaps: Snapshot[];
  reached: Record<string, number>;
  counts: Record<string, number>;
}

function vqMap(o: Overview, fin: NicheIsland[]): void {
  const V = o.vq;
  const K = V.xy.length;
  const occ: { isl: Record<number, 1>; best: number }[] = [];
  for (let k = 0; k < K; k++) occ.push({ isl: {}, best: 0 });
  for (const i of fin) {
    for (const c of i.grid) {
      const oc = occ[c[0]];
      if (!oc) continue;
      oc.isl[i.idx] = 1;
      oc.best = Math.max(oc.best, c[2]);
    }
  }
  const xs = V.xy.map((p) => p[0]);
  const ys = V.xy.map((p) => p[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  const W = 520;
  const H = 470;
  const P = 78;
  const X = (v: number) => P + ((v - x0) / (x1 - x0 || 1)) * (W - 2 * P);
  const Y = (v: number) => P - 10 + (1 - (v - y0) / (y1 - y0 || 1)) * (H - 2 * P);
  const pos = V.xy.map((p) => [X(p[0]), Y(p[1])]);
  const home = pos.map((p) => p.slice());
  const rad = occ.map((oc) => 7 + Object.keys(oc.isl).length * 2.6);
  // Push overlapping niches apart, with a weak spring back to their codebook position.
  for (let it = 0; it < 400; it++) {
    for (let a = 0; a < K; a++)
      for (let b = a + 1; b < K; b++) {
        const dx = pos[b][0] - pos[a][0];
        const dy = pos[b][1] - pos[a][1];
        const d = Math.hypot(dx, dy) || 0.01;
        const need = rad[a] + rad[b] + 26;
        if (d < need) {
          const m = (need - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          pos[a][0] -= ux * m;
          pos[a][1] -= uy * m;
          pos[b][0] += ux * m;
          pos[b][1] += uy * m;
        }
      }
    for (let c = 0; c < K; c++) {
      pos[c][0] += (home[c][0] - pos[c][0]) * 0.02;
      pos[c][1] += (home[c][1] - pos[c][1]) * 0.02;
      pos[c][0] = Math.max(40, Math.min(W - 40, pos[c][0]));
      pos[c][1] = Math.max(40, Math.min(H - 60, pos[c][1]));
    }
  }
  const PX = (k: number) => pos[k][0];
  const PY = (k: number) => pos[k][1];
  const L0 = 40;
  const B0 = 40;
  const s = [`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Twelve learned niches">`];
  s.push(`<rect x="${L0}" y="12" width="${W - L0 - 12}" height="${H - 12 - B0}" style="fill:${C.panel};stroke:${C.rule}"/>`);
  const ly = (H - B0) / 2 + 6;
  s.push(
    `<text x="${L0 + (W - L0) / 2}" y="${H - 12}" style="fill:${C.muted}" font-size="12" text-anchor="middle">codebook, component 1</text>` +
      `<text x="16" y="${ly}" style="fill:${C.muted}" font-size="12" text-anchor="middle" transform="rotate(-90 16 ${ly})">codebook, component 2</text>`,
  );
  V.xy.forEach((p, i) => {
    const d = V.xy
      .map((q, j): [number, number] => [j, Math.hypot(q[0] - p[0], q[1] - p[1])])
      .filter((a) => a[0] !== i)
      .sort((a, b) => a[1] - b[1]);
    for (const a of d.slice(0, 2)) {
      if (a[0] > i) s.push(`<line x1="${PX(i)}" y1="${PY(i)}" x2="${PX(a[0])}" y2="${PY(a[0])}" style="stroke:${C.rule}"/>`);
    }
  });
  occ.forEach((oc, k) => {
    const isl = Object.keys(oc.isl).map(Number);
    const n = isl.length;
    const cx = PX(k);
    const cy = PY(k);
    const r = rad[k];
    s.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" style="fill:${C.bg};stroke:${n ? C.ruleStrong : C.rule}"${n ? "" : ' stroke-dasharray="2 3"'}/>`,
    );
    isl.forEach((ii, t) => {
      const a = -Math.PI / 2 + (t / Math.max(1, n)) * Math.PI * 2;
      const rr = n > 1 ? r * 0.55 : 0;
      s.push(
        `<circle cx="${(cx + Math.cos(a) * rr).toFixed(1)}" cy="${(cy + Math.sin(a) * rr).toFixed(1)}" r="3.4" fill="${demeColor(ii)}" style="stroke:${C.bg}" stroke-width=".8"/>`,
      );
    });
    s.push(`<text x="${cx}" y="${cy + r + 13}" style="fill:${C.muted}" font-size="10.5" text-anchor="middle">N${k + 1}</text>`);
    s.push(
      `<circle cx="${cx}" cy="${cy}" r="${r + 4}" fill="transparent"><title>niche ${k + 1}: ` +
        (n ? `${n} demes hold an elite here; best ${oc.best.toFixed(4)}` : "empty at the end of the run") +
        "</title></circle>",
    );
  });
  s.push("</svg>");
  el("vqmap").insertAdjacentHTML("beforeend", s.join(""));
}

/** The niche export is not tagged with its run; identify it by its best score. */
function nicheRun(o: Overview, NI: Niches): string | null {
  const best = Math.max(...NI.final.map((i) => +i.best));
  return o.order.find((id) => Math.abs(o.runs[id].best - best) < 1e-6) ?? null;
}

function summary(NI: Niches, runId: string | null): void {
  const CN = NI.counts || {};
  const fin = NI.final;
  let cells = 0;
  for (const i of fin) cells += i.grid.length;
  const cn = (k: string) => CN[k] || 0;
  el("s-niche").innerHTML =
    `In <a class="xp" href="${ARENA_URL}" target="_blank" rel="noopener">${runId ? runName(runId) : "this run"}</a>, ${fin.length} demes held ${cells} occupied cells ` +
    `at the end, across twelve learned niches; the codebook was re-fitted ${cn("niches/rebuild")} times as the population moved.`;
  const M: [string, string, string][] = [
    [
      "Niches per deme",
      `${fin.length} demes · ${cells} cells`,
      'MAP-Elites over learned niches: a VQ codebook of up to twelve centroids in an embedding of the code, crossed with score bins. <span class="key">One elite per cell, so a new idea competes only with its own niche.</span>',
    ],
    [
      "Demes spawned mid-run",
      `${cn("dynamic_islands/spawn")}`,
      'Aimed at unexplored regions, chosen by a diffusion target, by density or by an untried paradigm. <span class="key">A new deme starts where the others are not.</span>',
    ],
    [
      "Novelty, run-wide",
      `${cn("candidate_novelty/accept")} accepted · ${cn("candidate_novelty/reject")} rejected`,
      'Repeats are caught by hash, AST and output before they cost an evaluation, <span class="key">so the budget goes to new guesses</span>.',
    ],
    [
      "Smoke → full → confirm",
      `${NI.reached.full || 0} reached full`,
      `A cheap smoke test first, the full stage next, then re-measurement of records: ${cn("confirmation/consistent")} agreed, ` +
        `${cn("confirmation/inconsistent")} did not, and <span class="key">the worst repeat is kept</span>.`,
    ],
    [
      "Parallel waves",
      `${cn("parallel_search/wave_dispatch")} waves · ${cn("parallel_search/job_committed")} jobs`,
      'Demes propose in parallel against shared capacity; every job is journaled, <span class="key">so a crashed run replays and continues</span>.',
    ],
    [
      "Population view",
      " 1.55 → 1.462",
      'A candidate imports its deme’s best construction and the task’s own objective while it runs, <span class="key">so it continues the measured object instead of rebuilding it</span>. On this task: the bound after the same 50 evaluations.',
    ],
  ];
  el("mach").innerHTML = M.map((m) => `<div><b>${m[0]}</b><div class="n">${m[1]}</div><p>${m[2]}</p></div>`).join("");
}

interface Label {
  el: HTMLDivElement;
  p: THREE.Vector3;
}

function grids(NI: Niches): void {
  const wrap = el("niche3d");
  const cv = el<HTMLCanvasElement>("cniche");
  const ov = el("ovniche");
  const tip = el("tipniche");
  const nplay = el("nplay");
  const reduced = prefersReducedMotion();
  let W = wrap.clientWidth || 1000;
  const MOB = W < 560;
  const height = () => (MOB ? Math.round(W * 1.2) : Math.round(Math.max(360, Math.min(560, W * 0.62))));
  let H = height();
  const rd = createRenderer(cv);
  rd.setSize(W, H, false);
  const sc = new THREE.Scene();
  sc.fog = new THREE.Fog(cssColor(C.bg), 120, 260);
  const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 600);
  const tg = new THREE.Vector3(0, 2, MOB ? 9 : 2);
  const sp = { t: MOB ? -0.04 : -0.12, p: MOB ? 0.62 : 0.9, r: MOB ? 150 : 142 };
  const gl = { t: sp.t, p: sp.p, r: sp.r };
  let dr: { x: number; y: number; t: number; p: number } | null = null;
  let touched = false;
  function plc() {
    cam.position.set(
      tg.x + sp.r * Math.sin(sp.p) * Math.sin(sp.t),
      tg.y + sp.r * Math.cos(sp.p),
      tg.z + sp.r * Math.sin(sp.p) * Math.cos(sp.t),
    );
    cam.lookAt(tg);
  }
  addEventListener("resize", () => {
    W = wrap.clientWidth || W;
    H = height();
    rd.setSize(W, H, false);
    cam.aspect = W / H;
    cam.updateProjectionMatrix();
  });
  const CS = 1.55;
  const GX = 12;
  const GZ = 10;
  const BW = GX * CS;
  const BD = GZ * CS;
  const GAP = 5;
  const COLS = MOB ? 2 : 4;
  const ROWS = 8 / COLS;
  function origin(k: number) {
    const c = k % COLS;
    const r = Math.floor(k / COLS);
    return new THREE.Vector3((c - (COLS - 1) / 2) * (BW + GAP), 0, (r - (ROWS - 1) / 2) * (BD + GAP + (MOB ? 3 : 0)));
  }
  const labs: Label[] = [];
  function lab(t: string, p: THREE.Vector3, color: string): Label {
    const e = document.createElement("div");
    e.className = "l3 mlab";
    e.textContent = t;
    e.style.color = color;
    ov.appendChild(e);
    const L = { el: e, p };
    labs.push(L);
    return L;
  }
  const base = new THREE.Group();
  sc.add(base);
  const gridColor = new THREE.Color(cssColor(C.rule));
  for (let k = 0; k < 8; k++) {
    const o = origin(k);
    const g = new THREE.BufferGeometry();
    const pts: number[] = [];
    for (let i = 0; i <= GX; i++) pts.push(o.x - BW / 2 + i * CS, 0, o.z - BD / 2, o.x - BW / 2 + i * CS, 0, o.z + BD / 2);
    for (let j = 0; j <= GZ; j++) pts.push(o.x - BW / 2, 0, o.z - BD / 2 + j * CS, o.x + BW / 2, 0, o.z - BD / 2 + j * CS);
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    base.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: gridColor, transparent: true, opacity: 0.8 })));
  }
  // Digits of agreement, floored at 1e-4 (the shared dig() floors at 1e-5).
  const dig = (s: number) => -Math.log10(Math.max(1 - s, 1e-4));
  const zeroColor = new THREE.Color(cssColor(C.ruleStrong));
  let dyn: THREE.Group | null = null;
  let bars: THREE.Mesh[] = [];
  let bmeta: { isl: number; c: NicheCell }[] = [];
  let ilabs: Label[] = [];
  const SN: Snapshot[] = [
    ...NI.snaps,
    [NI.snaps.length ? NI.snaps[NI.snaps.length - 1][0] + 20 : 200, NI.final],
  ];
  let si = SN.length - 1;
  let playing = !reduced;
  let timer: ReturnType<typeof setTimeout> | undefined;
  if (reduced) nplay.textContent = "Play";
  function draw(idx: number) {
    const snap = SN[idx];
    el("nIt").textContent = `attempt ${Math.min(snap[0], 200)}`;
    if (dyn) {
      sc.remove(dyn);
      dyn.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (m.material as THREE.Material).dispose();
      });
    }
    const group = new THREE.Group();
    dyn = group;
    sc.add(group);
    bars = [];
    bmeta = [];
    for (const L of ilabs) {
      L.el.remove();
      labs.splice(labs.indexOf(L), 1);
    }
    ilabs = [];
    for (const isl of snap[1]) {
      const o = origin(isl.idx);
      const col = new THREE.Color(demeColor(isl.idx));
      for (const c of isl.grid) {
        const s = c[2];
        const h = s > 0 ? Math.max(0.35, (dig(s) / 3) * 13) : 0.12;
        const geo = new THREE.BoxGeometry(CS * 0.82, h, CS * 0.82);
        const m = new THREE.Mesh(
          geo,
          new THREE.MeshBasicMaterial({ color: s > 0 ? col : zeroColor, transparent: true, opacity: 0.55, depthWrite: false }),
        );
        m.position.set(o.x - BW / 2 + (c[0] + 0.5) * CS, h / 2, o.z + BD / 2 - (c[1] + 0.5) * CS);
        group.add(m);
        const e = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.95 }),
        );
        e.position.copy(m.position);
        group.add(e);
        bars.push(m);
        bmeta.push({ isl: isl.idx, c });
      }
      const best = (+isl.best).toFixed(4);
      ilabs.push(
        lab(
          MOB ? `${demeName(isl.idx)} · ${best}` : `${demeName(isl.idx)} · ${isl.grid.length} cells · best ${best}`,
          new THREE.Vector3(o.x, 0.2, o.z + BD / 2 + 3.2),
          demeColor(isl.idx),
        ),
      );
    }
  }
  function step() {
    if (!playing) return;
    si = (si + 1) % SN.length;
    draw(si);
    timer = setTimeout(step, si === SN.length - 1 ? 3200 : 1300);
  }
  draw(si);
  const io = new IntersectionObserver(
    (es) => {
      for (const en of es) {
        if (en.isIntersecting && !wrap.dataset.on) {
          wrap.dataset.on = "1";
          if (!playing) return;
          si = -1;
          step();
        }
      }
    },
    { threshold: 0.3 },
  );
  io.observe(wrap);
  nplay.addEventListener("click", () => {
    playing = !playing;
    nplay.textContent = playing ? "Pause" : "Play";
    clearTimeout(timer);
    if (playing) step();
  });
  cv.addEventListener("pointerdown", (e) => {
    dr = { x: e.clientX, y: e.clientY, t: gl.t, p: gl.p };
    touched = true;
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointerup", () => {
    dr = null;
  });
  cv.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      gl.r = Math.max(70, Math.min(240, gl.r * (1 + e.deltaY * 0.001)));
    },
    { passive: false },
  );
  const ray = new THREE.Raycaster();
  const mo = new THREE.Vector2();
  cv.addEventListener("pointermove", (e) => {
    if (dr) {
      gl.t = dr.t - (e.clientX - dr.x) * 0.006;
      gl.p = Math.max(0.15, Math.min(1.45, dr.p - (e.clientY - dr.y) * 0.005));
      tip.hidden = true;
      return;
    }
    const b = cv.getBoundingClientRect();
    mo.x = ((e.clientX - b.left) / b.width) * 2 - 1;
    mo.y = (-(e.clientY - b.top) / b.height) * 2 + 1;
    ray.setFromCamera(mo, cam);
    const hit = ray.intersectObjects(bars)[0];
    if (!hit) {
      tip.hidden = true;
      return;
    }
    const m = bmeta[bars.indexOf(hit.object as THREE.Mesh)];
    tip.innerHTML =
      `<div class="t-n">${m.c[2] > 0 ? (+m.c[2]).toFixed(4) : "scored zero"}</div>` +
      `<div class="t-m">${demeName(m.isl)} · cell (${m.c[0]}, ${m.c[1]})</div>`;
    tip.hidden = false;
    placeTip(wrap, tip, e);
  });
  cv.addEventListener("pointerleave", () => {
    tip.hidden = true;
  });
  const v3 = new THREE.Vector3();
  const fr = () => {
    requestAnimationFrame(fr);
    if (!isVisible(wrap)) return;
    if (!touched && !reduced) gl.t += 0.0006;
    sp.t += (gl.t - sp.t) * 0.12;
    sp.p += (gl.p - sp.p) * 0.12;
    sp.r += (gl.r - sp.r) * 0.12;
    plc();
    rd.render(sc, cam);
    for (const L of labs) {
      v3.copy(L.p).project(cam);
      if (v3.z > 1) {
        L.el.style.transform = "translate(-9999px,-9999px)";
        continue;
      }
      L.el.style.transform = `translate(${(((v3.x + 1) / 2) * W).toFixed(1)}px,${(((1 - v3.y) / 2) * H).toFixed(1)}px)`;
    }
  };
  fr();
}

export async function mount(): Promise<void> {
  const o = await loadOverview();
  const NI = o.niches as Niches;
  vqMap(o, NI.final);
  summary(NI, nicheRun(o, NI));
  grids(NI);
}
