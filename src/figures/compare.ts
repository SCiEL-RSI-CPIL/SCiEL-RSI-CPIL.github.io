// "Four ways to search": four searchers race on one toy landscape (three.js), plus a table of
// 30 trials of each searcher and of SCiEL with each component switched off.
// Ported from legacy/assets/compare.js. Root: #mcompare (the table); the 3D view is #mech3d.

import * as THREE from "three";
import { C, cssColor, el, isVisible, prefersReducedMotion } from "../lib/core";
import { MCOL0, MODES, mechanismScene } from "./compare-scene";
import { makeWorld, runMode, type Mode, type ModeOptions, type PolicyState, type Pt, type SearchRun } from "./world";

type Component = keyof ModeOptions;

interface Head {
  sp: THREE.Sprite;
  ring: THREE.Mesh;
  fill: THREE.Mesh;
}

interface Built {
  run: SearchRun;
  objs: THREE.Object3D[];
  g: THREE.Group;
  heads: Head[];
}

const B = 200;

export async function mount(): Promise<void> {
  const WD = makeWorld();
  const { wrap, cv, rd, sc, cam, XL, sp, gl, dim, cols, plc, at, panels, MLAB, discT, ringT, DL } = mechanismScene(WD);
  const opt: Required<ModeOptions> = { policy: true, world: true, culture: true, research: true };
  const MCOL = MCOL0;
  const R4: Partial<Record<Mode, Built>> = {};
  // Each pass of the animation is a fresh trial with a new random seed; the label counts trials from 1.
  let runSeed = 1007;
  let looping = true;
  let loopT: ReturnType<typeof setTimeout> | undefined;
  let drg: { x: number; y: number; t: number; p: number } | null = null;
  let touched = false;
  const reduced = prefersReducedMotion();
  const mT = el<HTMLInputElement>("mT");
  const mplay = el("mplay");

  function arc(a: Pt, b: Pt, hgt: number, n: number): THREE.Vector3[] {
    const pa = at(a, 0.4);
    const pb = at(b, 0.4);
    const out: THREE.Vector3[] = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const p = pa.clone().lerp(pb, t);
      p.y += Math.sin(Math.PI * t) * hgt;
      out.push(p);
    }
    return out;
  }
  function trail(a: Pt, b: Pt): THREE.Vector3[] {
    const out: THREE.Vector3[] = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      out.push(at([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], 0.45));
    }
    return out;
  }
  function dispose(g: THREE.Object3D) {
    g.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (m.material as THREE.Material).dispose();
    });
  }

  function buildMode(mode: Mode) {
    const old = R4[mode];
    if (old) {
      sc.remove(old.g);
      dispose(old.g);
    }
    const run = runMode(WD, mode, B, runSeed, mode === "sciel" ? opt : {});
    const g = new THREE.Group();
    g.visible = false;
    sc.add(g);
    const objs: THREE.Object3D[] = [];
    // Single searchers are drawn in a neutral; the five-searcher modes use one hue per searcher.
    const single = cssColor(mode === "bestn" ? C.ink2 : C.ink);
    const muted = new THREE.Color(cssColor(C.muted));
    for (const e of run.ev) {
      const c = new THREE.Color(mode === "bestn" || mode === "climber" ? single : MCOL[e.i % 5]);
      let obj: THREE.Object3D;
      if (e.k === "screen") {
        obj = new THREE.Sprite(
          new THREE.SpriteMaterial({ map: ringT, color: muted, transparent: true, opacity: 0.7, depthWrite: false }),
        );
        obj.position.copy(at(e.p, 0.5));
        obj.scale.set(1.3, 1.3, 1);
      } else if (e.k === "chord") {
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(arc(e.from, e.p, 7, 30)),
          e.acc
            ? new THREE.LineBasicMaterial({ color: 0xe0637f })
            : new THREE.LineDashedMaterial({ color: 0xe0637f, dashSize: 0.7, gapSize: 0.6, transparent: true, opacity: 0.7 }),
        );
        if (!e.acc) line.computeLineDistances();
        obj = line;
      } else if (e.k === "jump") {
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(arc(e.from, e.p, 5, 24)),
          new THREE.LineDashedMaterial({ color: 0xa66be0, dashSize: 0.5, gapSize: 0.4 }),
        );
        line.computeLineDistances();
        obj = line;
      } else if (e.acc && mode !== "bestn") {
        obj = new THREE.Line(new THREE.BufferGeometry().setFromPoints(trail(e.from, e.p)), new THREE.LineBasicMaterial({ color: c }));
      } else {
        obj = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: discT,
            color: c,
            transparent: true,
            opacity: mode === "bestn" && e.acc ? 1 : 0.45,
            depthWrite: false,
          }),
        );
        obj.position.copy(at(e.p, 0.4));
        const s = mode === "bestn" && e.acc ? 2 : 0.9;
        obj.scale.set(s, s, 1);
      }
      obj.visible = false;
      g.add(obj);
      objs.push(obj);
    }
    const heads: Head[] = [];
    const nl = mode === "bestn" || mode === "climber" ? 1 : 5;
    for (let i = 0; i < nl; i++) {
      const cc = new THREE.Color(mode === "bestn" || mode === "climber" ? single : MCOL[i]);
      const hd = new THREE.Sprite(new THREE.SpriteMaterial({ map: discT, color: cc, transparent: true, depthWrite: false }));
      hd.scale.set(2.6, 2.6, 1);
      g.add(hd);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.9, 1, 48),
        new THREE.MeshBasicMaterial({ color: cc, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
      );
      ring.rotation.x = -Math.PI / 2;
      g.add(ring);
      const fill = new THREE.Mesh(
        new THREE.CircleGeometry(1, 48),
        new THREE.MeshBasicMaterial({ color: cc, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
      );
      fill.rotation.x = -Math.PI / 2;
      g.add(fill);
      heads.push({ sp: hd, ring, fill });
    }
    R4[mode] = { run, objs, g, heads };
  }

  function buildAll() {
    for (const [mode] of MODES) buildMode(mode);
    show(+mT.value);
  }

  function show(t: number) {
    MODES.forEach(([mode], mi) => {
      const o = R4[mode];
      if (!o) return;
      const evs = o.run.ev;
      let best = 0;
      const pol: Record<number, PolicyState> = {};
      const headAt: Record<number, Pt> = {};
      for (let k = 0; k < evs.length; k++) {
        const e = evs[k];
        o.objs[k].visible = e.t <= t && !(e.k === "screen" && (e.t >= t || e.t < t - 20));
        if (e.t <= t && e.v != null && e.v > best) best = e.v;
        if (e.t <= t && e.pol) pol[e.pol.i] = e.pol;
        if (e.t <= t && e.acc && e.k !== "screen" && mode !== "bestn") headAt[e.i] = e.p;
      }
      o.heads.forEach((h, i) => {
        const p = mode === "bestn" ? WD.seed : headAt[i] || (pol[i] && pol[i].c) || WD.seed;
        const po = pol[i];
        h.sp.position.copy(at(p, 1.1));
        const sg = po ? po.s : 0.09;
        const mu = po ? po.mu : [0, 0];
        const rr = Math.max(1.4, ((sg * XL) / 2) * 1.6);
        const cp = at([p[0] + mu[0], p[1] + mu[1]], 0.6);
        const vis = mode !== "bestn" && t > 0;
        h.ring.visible = h.fill.visible = vis;
        h.ring.position.copy(cp);
        h.fill.position.copy(cp);
        const stretch = 1 + Math.min(2.5, Math.hypot(mu[0], mu[1]) * 25);
        const ang = Math.atan2(-mu[1], mu[0]);
        h.ring.scale.set(rr * stretch, rr, 1);
        h.fill.scale.set(rr * stretch, rr, 1);
        h.ring.rotation.z = ang;
        h.fill.rotation.z = ang;
      });

      const at3 = (i: number) => headAt[i] || (pol[i] && pol[i].c);
      if (mode === "bestn") {
        let bi = -1;
        let bv = -1;
        for (let q = 0; q < evs.length; q++) {
          const v = evs[q].v;
          if (evs[q].t <= t && v != null && v > bv) {
            bv = v;
            bi = q;
          }
        }
        DL.bestn.best.on = bi >= 0;
        if (bi >= 0) DL.bestn.best.p.copy(at(evs[bi].p, 3));
      }
      if (mode === "climber") {
        const hp = headAt[0] || WD.seed;
        let stall = 0;
        for (let q2 = evs.length - 1; q2 >= 0; q2--) {
          const e2 = evs[q2];
          if (e2.t > t) continue;
          if (e2.acc) break;
          stall++;
        }
        const head = DL.climber.head;
        head.p.copy(at(hp, 3.4));
        head.w = 0;
        head.el.textContent = stall >= 25 ? "climber: stuck on a local bump" : "climber";
        head.on = t > 0;
      }
      if (mode === "swarm")
        DL.swarm.heads.forEach((L, i) => {
          const hp = at3(i);
          L.on = !!hp && t > 0;
          if (hp) L.p.copy(at(hp, 3.2));
        });
      if (mode === "sciel") {
        const dl = DL.sciel;
        dl.heads.forEach((L, i) => {
          const hp = at3(i);
          L.on = !!hp && t > 0 && t < B * 0.55;
          if (hp) L.p.copy(at(hp, 3.2));
        });
        let lc = null;
        let ls = null;
        let lj = null;
        for (const e3 of evs) {
          if (e3.t > t) break;
          if (e3.k === "chord" && e3.acc && e3.t > t - 40) lc = e3;
          if (e3.k === "screen" && e3.t < t && e3.t >= t - 6) ls = e3;
          if (e3.k === "jump" && e3.t > t - 30) lj = e3;
        }
        dl.chord.on = !!lc;
        if (lc) dl.chord.p.copy(at([(lc.from[0] + lc.p[0]) / 2, (lc.from[1] + lc.p[1]) / 2], 8.5));
        dl.screen.on = !!ls && best < 0.95;
        if (ls) dl.screen.p.copy(at(ls.p, 2.4));
        dl.jump.on = !!lj;
        if (lj) dl.jump.p.copy(at([(lj.from[0] + lj.p[0]) / 2, (lj.from[1] + lj.p[1]) / 2], 6.5));
        const p0 = pol[0];
        dl.policy.on = !!p0 && t > 8 && best < 0.95;
        if (p0) dl.policy.p.copy(at([p0.c[0] + p0.mu[0], p0.c[1] + p0.mu[1] - 0.07], 1.2));
      }
      const mb = panels[mi].querySelector(".mb");
      if (mb) mb.innerHTML = `best <b>${best.toFixed(3)}</b>${best > 0.95 ? ` · <b style="color:${C.up}">summit</b>` : ""}`;
    });
    el("mTv").textContent = `trial ${runSeed - 1006} · evaluation ${t} of ${B}`;
  }

  el("mcomp").addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLElement>("button");
    if (!b) return;
    const c = b.dataset.c as Component;
    opt[c] = !opt[c];
    b.classList.toggle("on", opt[c]);
    buildMode("sciel");
    play();
  });
  mT.addEventListener("input", () => {
    looping = false;
    stop();
    show(+mT.value);
  });
  let raf = 0;
  function stop() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    clearTimeout(loopT);
    mplay.textContent = looping ? "Pause" : "Play";
  }
  function play() {
    if (raf) cancelAnimationFrame(raf);
    clearTimeout(loopT);
    looping = true;
    mplay.textContent = "Pause";
    const t0 = performance.now();
    const st = (now: number) => {
      const t = Math.min(B, Math.round(((now - t0) / 9000) * B));
      mT.value = String(t);
      show(t);
      if (t < B) {
        raf = requestAnimationFrame(st);
        return;
      }
      raf = 0;
      loopT = setTimeout(() => {
        if (!looping) return;
        runSeed++;
        buildAll();
        play();
      }, 2600);
    };
    st(t0);
  }
  mplay.addEventListener("click", () => {
    if (looping) {
      looping = false;
      stop();
    } else play();
  });
  buildAll();
  if (reduced) {
    // No auto-play: the final state stays on screen until the reader presses Play.
    looping = false;
  } else {
    const io = new IntersectionObserver(
      (es) => {
        for (const en of es) {
          if (en.isIntersecting && !wrap.dataset.played) {
            wrap.dataset.played = "1";
            play();
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(wrap);
  }

  setTimeout(() => {
    const rows: [string, Mode, ModeOptions][] = [
      ["One call · best of N", "bestn", {}],
      ["One climber", "climber", {}],
      ["Swarm", "swarm", {}],
      ["SCiEL", "sciel", {}],
      ["SCiEL without the policy", "sciel", { policy: false }],
      ["SCiEL without the world model", "sciel", { world: false }],
      ["SCiEL without culture", "sciel", { culture: false }],
      ["SCiEL without research cells", "sciel", { research: false }],
    ];
    let out =
      '<span class="hd">30 trials each, 200 evaluations</span><span class="hd">mean best score</span>' +
      '<span class="hd" style="text-align:right">reached the summit</span>';
    for (const [name, mode, o] of rows) {
      let s = 0;
      let h = 0;
      for (let k = 0; k < 30; k++) {
        const x = runMode(WD, mode, B, 500 + k, o);
        s += x.best;
        h += x.best > 0.95 ? 1 : 0;
      }
      const m = s / 30;
      const isS = name === "SCiEL";
      const bar = mode === "sciel" ? (isS ? "#0A84FF" : "rgba(10,132,255,.45)") : C.ruleStrong;
      out +=
        `<span class="s" style="${isS ? "color:var(--ink);font-weight:600" : ""}">${name}</span>` +
        `<div class="b"><i style="width:${m * 100}%;background:${bar}"></i></div>` +
        `<span class="n">${m.toFixed(2)} · ${h}/30</span>`;
    }
    el("mcompare").innerHTML = out;
  }, 300);

  cv.addEventListener("pointerdown", (e) => {
    drg = { x: e.clientX, y: e.clientY, t: gl.t, p: gl.p };
    touched = true;
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointerup", () => {
    drg = null;
  });
  cv.addEventListener("pointermove", (e) => {
    if (!drg) return;
    gl.t = drg.t - (e.clientX - drg.x) * 0.006;
    gl.p = Math.max(0.12, Math.min(1.45, drg.p - (e.clientY - drg.y) * 0.005));
  });
  cv.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      gl.r = Math.max(70, Math.min(240, gl.r * (1 + e.deltaY * 0.001)));
    },
    { passive: false },
  );

  const v3 = new THREE.Vector3();
  const offscreen = "translate(-9999px,-9999px)";
  const fr = () => {
    requestAnimationFrame(fr);
    if (!isVisible(wrap)) return;
    if (!touched && !reduced) gl.t += 0.0005;
    sp.t += (gl.t - sp.t) * 0.12;
    sp.p += (gl.p - sp.p) * 0.12;
    sp.r += (gl.r - sp.r) * 0.12;
    plc();
    const c = cols();
    MODES.forEach(([mode], i) => {
      for (const [n] of MODES) {
        const b = R4[n];
        if (b) b.g.visible = n === mode;
      }
      const x = (i % c) * dim.PW;
      const y = dim.MH - (Math.floor(i / c) + 1) * dim.PH;
      rd.setViewport(x, y, dim.PW, dim.PH);
      rd.setScissor(x, y, dim.PW, dim.PH);
      rd.render(sc, cam);
    });
    for (const L of MLAB) {
      if (!L.on) {
        L.el.style.transform = offscreen;
        continue;
      }
      v3.copy(L.p).project(cam);
      if (v3.z > 1 || Math.abs(v3.x) > 1.05 || Math.abs(v3.y) > 1.05) {
        L.el.style.transform = offscreen;
        continue;
      }
      const ox = (L.pi % c) * dim.PW;
      const oy = Math.floor(L.pi / c) * dim.PH;
      const hw = (L.w || (L.w = L.el.offsetWidth || 80)) / 2 + 8;
      const px = Math.max(ox + hw, Math.min(ox + dim.PW - hw, ox + ((v3.x + 1) / 2) * dim.PW));
      const py = Math.max(oy + 58, oy + ((1 - v3.y) / 2) * dim.PH);
      L.el.style.transform = `translate(${px.toFixed(1)}px,${py.toFixed(1)}px)`;
    }
  };
  fr();
}
