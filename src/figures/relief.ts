// "The run as a relief": every scored program of the current run placed on a 2D layout
// (culture disk, code embedding, behaviour or time × deme) and lifted by its score, with an
// interpolated surface or contours underneath (three.js).
// Ported from legacy/assets/relief.js. Root: #map3d.

import * as THREE from "three";
import { C, cssColor, demeColor, dig, el, esc, f4, isVisible, prefersReducedMotion, sup } from "../lib/core";
import { loadRun, programsById, type Program, type Run } from "../lib/data";
import { currentRunId, onRunChange } from "../lib/run-state";
import { placeTip, tipFor } from "../lib/tooltip";
import { demeName } from "../data/names";
import { diskModel } from "./disk-model";
import { createRenderer, discTexture, glowTexture } from "./world";

type AxesMode = "disk" | "code" | "landscape" | "time";
type SurfaceMode = "surface" | "contours" | "points";

interface Item {
  id: string;
  p: Program;
  x: number;
  y: number;
  d: number;
}

interface Label {
  el: HTMLDivElement;
  p: THREE.Vector3;
}

const VIEWS = {
  corner: { t: -0.62, p: 1.08, r: 112 },
  front: { t: 0.0001, p: 1.38, r: 104 },
  side: { t: -Math.PI / 2, p: 1.3, r: 104 },
  top: { t: -0.0001, p: 0.02, r: 118 },
  low: { t: -0.9, p: 1.5, r: 96 },
  orbit: { t: -0.62, p: 1.0, r: 118 },
};
type View = keyof typeof VIEWS;

const AXN: Record<AxesMode, [string, string] | null> = {
  code: ["code, component 1", "code, component 2"],
  landscape: null,
  disk: ["culture disk", "sector = deme · radius = generation"],
  time: ["attempt", "deme"],
};

/** Program id → layout position in [0, 1]². */
function coordsFor(r: Run, m: AxesMode): Record<string, [number, number]> {
  if (m === "code" || m === "landscape") return r.coords[m] || {};
  const out: Record<string, [number, number]> = {};
  if (m === "disk") {
    const dm = diskModel(r);
    for (const id of Object.keys(dm.dots)) out[id] = [dm.dots[id].x as number, dm.dots[id].y as number];
    return out;
  }
  let mx = 1;
  let ni = 1;
  for (const p of r.programs) {
    mx = Math.max(mx, p[6] || 0);
    ni = Math.max(ni, (p[2] || 0) + 1);
  }
  for (const p of r.programs) out[p[0]] = [0.03 + (0.94 * (p[6] || 0)) / mx, 0.06 + (0.88 * ((p[2] || 0) + 0.5)) / ni];
  return out;
}

const segButtons = (seg: HTMLElement, on: Element) => {
  for (const x of seg.children) x.classList.toggle("on", x === on);
};

export async function mount(): Promise<void> {
  const wrap = el("map3d");
  const canvas = el<HTMLCanvasElement>("c3d");
  const ov = el("ov3d");
  const tip = el("tip3d");
  const reduced = prefersReducedMotion();
  let W = wrap.clientWidth || 1400;
  let H = Math.round(Math.max(420, Math.min(720, W * 0.52)));
  const renderer = createRenderer(canvas);
  renderer.setSize(W, H, false);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(cssColor(C.bg), 170, 330);
  const camera = new THREE.PerspectiveCamera(30, W / H, 0.1, 600);
  const XL = 60;
  const ZL = 44;
  const YL = 24;
  const target = new THREE.Vector3(0, YL * 0.4, 0);
  const sph = { ...VIEWS.corner };
  let goal = { ...sph };
  let drag: { x: number; y: number; t: number; p: number } | null = null;
  let touched = false;
  function place() {
    camera.position.set(
      target.x + sph.r * Math.sin(sph.p) * Math.sin(sph.t),
      target.y + sph.r * Math.cos(sph.p),
      target.z + sph.r * Math.sin(sph.p) * Math.cos(sph.t),
    );
    camera.lookAt(target);
  }
  addEventListener("resize", () => {
    W = wrap.clientWidth || W;
    H = Math.round(Math.max(340, Math.min(720, W * (W < 760 ? 0.95 : 0.52))));
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
  });
  const disc = discTexture();
  const glow = glowTexture();
  // Neutral line colours, resolved once from the theme.
  const strong = new THREE.Color(cssColor(C.ruleStrong));
  const grid = new THREE.Color(cssColor(C.rule));
  const edgeCol = new THREE.Color(cssColor(C.ink2));
  const recCol = new THREE.Color(cssColor(C.ink));
  let group: THREE.Group | null = null;
  let labels: Label[] = [];
  let pts: THREE.Points | null = null;
  let meta3: Program[] = [];
  let amode: AxesMode = "disk";
  let smode: SurfaceMode = "surface";
  let orbit = false;
  let run: Run | null = null;

  function lab(text: string, pos: THREE.Vector3, cls = "") {
    const e = document.createElement("div");
    e.className = `l3 ${cls}`;
    e.textContent = text;
    ov.appendChild(e);
    labels.push({ el: e, p: pos });
    return e;
  }
  function line(g: THREE.Group, a: THREE.Vector3[], color: THREE.Color, op: number, dashed?: boolean) {
    const geo = new THREE.BufferGeometry().setFromPoints(a);
    const m = dashed
      ? new THREE.LineDashedMaterial({ color, transparent: true, opacity: op, dashSize: 0.6, gapSize: 0.9 })
      : new THREE.LineBasicMaterial({ color, transparent: true, opacity: op });
    const l = new THREE.Line(geo, m);
    if (dashed) l.computeLineDistances();
    g.add(l);
    return l;
  }
  const LOW = new THREE.Color("#0B1626");
  const HIGH = new THREE.Color("#5AB0FF");

  function build() {
    if (!run) return;
    const r = run;
    if (group) {
      scene.remove(group);
      group.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) (m.material as THREE.Material).dispose();
      });
    }
    for (const L of labels) L.el.remove();
    labels = [];
    const grp = new THREE.Group();
    group = grp;
    scene.add(grp);
    const by = programsById(r);
    const items: Item[] = [];
    const c = coordsFor(r, amode);
    for (const id of Object.keys(c)) {
      const p = by.get(id);
      if (p && p[4] != null && p[4] > 0) items.push({ id, p, x: c[id][0], y: c[id][1], d: dig(p[4]) });
    }
    if (!items.length) return;
    const ds = items.map((i) => i.d).sort((a, b) => a - b);
    let dlo = ds[Math.floor(ds.length * 0.04)];
    let dhi = ds[ds.length - 1];
    dlo = Math.floor(dlo * 2) / 2;
    dhi = Math.ceil(dhi * 2) / 2;
    if (dhi <= dlo) dhi = dlo + 1;
    const X = (x: number) => (x - 0.5) * XL;
    const Z = (y: number) => (0.5 - y) * ZL;
    const Yh = (d: number) => Math.max(0, (d - dlo) / (dhi - dlo)) * YL;
    const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

    // Inverse-distance-weighted surface, cut away where no program is near.
    const N = 56;
    const pos: number[] = [];
    const col: number[] = [];
    const ok: boolean[] = [];
    const ix: number[] = [];
    const hs: number[] = [];
    for (let j = 0; j <= N; j++)
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const v = j / N;
        let ws = 0;
        let wv = 0;
        let near = 9;
        for (const q of items) {
          const dd = Math.hypot(q.x - u, q.y - v);
          near = Math.min(near, dd);
          const w = 1 / (Math.pow(dd, 3) + 1e-5);
          ws += w;
          wv += w * q.d;
        }
        const h = wv / ws;
        const t = Math.max(0, Math.min(1, (h - dlo) / (dhi - dlo)));
        const band = Math.floor(t * 10) / 10;
        const cc = LOW.clone().lerp(HIGH, Math.pow(band, 1.2));
        pos.push(X(u), Yh(h), Z(v));
        col.push(cc.r, cc.g, cc.b);
        ok.push(amode === "landscape" || near < (amode === "time" ? 0.05 : 0.075));
        hs.push(h);
      }
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const a = j * (N + 1) + i;
        const b = a + 1;
        const d2 = a + N + 1;
        const e2 = d2 + 1;
        if (ok[a] && ok[b] && ok[d2]) ix.push(a, d2, b);
        if (ok[b] && ok[e2] && ok[d2]) ix.push(b, d2, e2);
      }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    sg.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    sg.setIndex(ix);
    if (smode !== "points")
      grp.add(
        new THREE.Mesh(
          sg,
          new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: smode === "contours" ? 0.12 : 0.62,
            side: THREE.DoubleSide,
            depthWrite: false,
          }),
        ),
      );
    if (smode === "contours") {
      const cl: number[] = [];
      const cc2: number[] = [];
      const CONTOUR = new THREE.Color("#9AD0FF");
      for (let lv = Math.ceil(dlo * 4) / 4; lv < dhi; lv += 0.25) {
        const tc = Math.max(0, Math.min(1, (lv - dlo) / (dhi - dlo)));
        const ccol = LOW.clone().lerp(CONTOUR, 0.25 + 0.75 * tc);
        const yy = Yh(lv);
        for (let j = 0; j < N; j++)
          for (let i = 0; i < N; i++) {
            const a0 = j * (N + 1) + i;
            const a1 = a0 + 1;
            const a3 = a0 + N + 1;
            const a2 = a3 + 1;
            if (!(ok[a0] && ok[a1] && ok[a2] && ok[a3])) continue;
            const vs = [hs[a0], hs[a1], hs[a2], hs[a3]];
            const cs: [number, number][] = [
              [i, j],
              [i + 1, j],
              [i + 1, j + 1],
              [i, j + 1],
            ];
            const ptsC: [number, number][] = [];
            for (let e = 0; e < 4; e++) {
              const v0 = vs[e];
              const v1 = vs[(e + 1) % 4];
              if (v0 < lv !== v1 < lv) {
                const f = (lv - v0) / (v1 - v0);
                const p0 = cs[e];
                const p1 = cs[(e + 1) % 4];
                ptsC.push([(p0[0] + (p1[0] - p0[0]) * f) / N, (p0[1] + (p1[1] - p0[1]) * f) / N]);
              }
            }
            for (let q2 = 0; q2 + 1 < ptsC.length; q2 += 2) {
              cl.push(X(ptsC[q2][0]), yy, Z(ptsC[q2][1]), X(ptsC[q2 + 1][0]), yy, Z(ptsC[q2 + 1][1]));
              cc2.push(ccol.r, ccol.g, ccol.b, ccol.r, ccol.g, ccol.b);
            }
          }
      }
      const cg = new THREE.BufferGeometry();
      cg.setAttribute("position", new THREE.Float32BufferAttribute(cl, 3));
      cg.setAttribute("color", new THREE.Float32BufferAttribute(cc2, 3));
      grp.add(new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 })));
    }

    // Floor frame, floor grid, axis titles, and the height axis on the back-left corner.
    line(grp, [V3(X(0), 0, Z(0)), V3(X(1), 0, Z(0)), V3(X(1), 0, Z(1)), V3(X(0), 0, Z(1)), V3(X(0), 0, Z(0))], strong, 0.8);
    for (let g = 1; g < 5; g++) {
      line(grp, [V3(X(g / 5), 0, Z(0)), V3(X(g / 5), 0, Z(1))], grid, 0.5, true);
      line(grp, [V3(X(0), 0, Z(g / 5)), V3(X(1), 0, Z(g / 5))], grid, 0.5, true);
    }
    const ax = (amode === "landscape" ? r.axes.landscape : AXN[amode]) || ["", ""];
    lab(ax[0], V3(0, 0, Z(0) + 5), "title");
    lab(ax[1], V3(X(1) + 6, 0, 0), "title");
    const hx = X(0);
    const hz = Z(1);
    line(grp, [V3(hx, 0, hz), V3(hx, YL + 1, hz)], strong, 0.8);
    for (let k = Math.ceil(dlo); k <= dhi; k++) {
      const y = Yh(k);
      line(grp, [V3(hx - 0.7, y, hz), V3(hx + 0.7, y, hz)], strong, 0.9);
      line(grp, [V3(X(0), y, hz), V3(X(1), y, hz)], grid, 0.35, true);
      lab(`1 − score = ${sup(k)}`, V3(hx - 1.6, y, hz), "lvl");
    }

    // Programs, parent → child edits, and the record chain.
    const pmap: Record<string, THREE.Vector3> = {};
    for (const q of items) pmap[q.id] = V3(X(q.x), Yh(q.d), Z(q.y));
    const lp: number[] = [];
    for (const q of items) {
      const pa = q.p[1] && pmap[q.p[1]];
      if (pa) lp.push(pa.x, pa.y, pa.z, pmap[q.id].x, pmap[q.id].y, pmap[q.id].z);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3));
    grp.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: edgeCol, transparent: true, opacity: 0.28 })));
    const pp: number[] = [];
    const pc: number[] = [];
    meta3 = [];
    for (const q of items) {
      const v3 = pmap[q.id];
      const cc = new THREE.Color(demeColor(q.p[2]));
      pp.push(v3.x, v3.y, v3.z);
      pc.push(cc.r, cc.g, cc.b);
      meta3.push(q.p);
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.Float32BufferAttribute(pp, 3));
    pg.setAttribute("color", new THREE.Float32BufferAttribute(pc, 3));
    pts = new THREE.Points(
      pg,
      new THREE.PointsMaterial({ size: 2.4, map: disc, vertexColors: true, transparent: true, alphaTest: 0.3, depthWrite: false }),
    );
    grp.add(pts);
    const chainIds = r.chain.map((ch) => ch.child).filter((id) => pmap[id]);
    if (chainIds.length > 1)
      line(
        grp,
        chainIds.map((id) => pmap[id]),
        recCol,
        0.85,
      );
    for (const id of chainIds) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, opacity: 0.35, depthWrite: false }));
      s.position.copy(pmap[id]);
      s.scale.set(3, 3, 1);
      grp.add(s);
    }
    const lastId = chainIds[chainIds.length - 1];
    if (chainIds.length) lab(f4(by.get(lastId)?.[4]), pmap[lastId], "rec");
    const isl = new Set(items.map((q) => q.p[2]));
    el("leg3d").innerHTML =
      [...isl]
        .sort((a, b) => a - b)
        .map((k) => `<span><i style="background:${demeColor(k)}"></i>${demeName(k)}</span>`)
        .join("") +
      `<span><i class="ln" style="background:${C.ink2}"></i>edit, parent to child</span>` +
      `<span><i class="ln" style="background:${C.ink}"></i>records</span>` +
      (amode === "code" && r.codecap ? `<span>${esc(r.codecap)}</span>` : "");
  }

  let want = "";
  async function showRun(id: string) {
    want = id;
    const r = await loadRun(id);
    if (want !== id) return;
    run = r;
    build();
  }
  await showRun(await currentRunId());
  onRunChange((id) => void showRun(id));

  const amodeSeg = el("amode");
  amodeSeg.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("button");
    if (!b) return;
    amode = b.dataset.m as AxesMode;
    segButtons(amodeSeg, b);
    build();
  });
  const smodeSeg = el("smode");
  smodeSeg.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("button");
    if (!b) return;
    smode = b.dataset.m as SurfaceMode;
    segButtons(smodeSeg, b);
    build();
  });
  const viewsSeg = el("views");
  viewsSeg.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("button");
    if (!b) return;
    const name = b.dataset.v as View;
    goal = { ...VIEWS[name] };
    touched = true;
    orbit = name === "orbit";
    segButtons(viewsSeg, b);
  });
  canvas.addEventListener("pointerdown", (e) => {
    orbit = false;
    drag = { x: e.clientX, y: e.clientY, t: goal.t, p: goal.p };
    touched = true;
    canvas.setPointerCapture(e.pointerId);
    canvas.style.cursor = "grabbing";
  });
  canvas.addEventListener("pointerup", () => {
    drag = null;
    canvas.style.cursor = "grab";
  });
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      goal.r = Math.max(50, Math.min(260, goal.r * (1 + e.deltaY * 0.001)));
    },
    { passive: false },
  );
  const ray = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  ray.params.Points.threshold = 0.8;
  canvas.addEventListener("pointermove", (e) => {
    if (drag) {
      goal.t = drag.t - (e.clientX - drag.x) * 0.006;
      goal.p = Math.max(0.02, Math.min(1.52, drag.p - (e.clientY - drag.y) * 0.005));
      tip.hidden = true;
      return;
    }
    const b = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - b.left) / b.width) * 2 - 1;
    mouse.y = (-(e.clientY - b.top) / b.height) * 2 + 1;
    ray.setFromCamera(mouse, camera);
    const hit = pts && ray.intersectObject(pts)[0];
    if (!hit || hit.index == null) {
      tip.hidden = true;
      return;
    }
    tipFor(tip, meta3[hit.index]);
    placeTip(wrap, tip, e);
  });
  canvas.addEventListener("pointerleave", () => {
    tip.hidden = true;
  });
  const v3 = new THREE.Vector3();
  const frame = () => {
    requestAnimationFrame(frame);
    if (!isVisible(wrap)) return;
    // The slow idle drift is skipped for reduced motion; an explicit "Orbit" view still turns.
    if (!touched && !reduced) goal.t += 0.0007;
    if (orbit) goal.t += 0.004;
    sph.t += (goal.t - sph.t) * 0.12;
    sph.p += (goal.p - sph.p) * 0.12;
    sph.r += (goal.r - sph.r) * 0.12;
    place();
    renderer.render(scene, camera);
    for (const L of labels) {
      v3.copy(L.p).project(camera);
      if (v3.z > 1) {
        L.el.style.transform = "translate(-9999px,-9999px)";
        continue;
      }
      L.el.style.transform = `translate(${(((v3.x + 1) / 2) * W).toFixed(1)}px,${(((1 - v3.y) / 2) * H).toFixed(1)}px)`;
    }
  };
  frame();
}
