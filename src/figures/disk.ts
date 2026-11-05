// Hero: the culture disk of the first run, with lineage brushing and a reading key.
// Ported from legacy/assets/disk.js (the geometry lives in disk-model.ts).

import { C, demeColor, el, esc, f4, isVisible, prefersReducedMotion } from "../lib/core";
import { loadOverview, loadRun, programsById, type Run } from "../lib/data";
import { hover } from "../lib/tooltip";
import { demeName } from "../data/names";
import { demeIndexOfLabel, diskModel, geodesic, type Pt } from "./disk-model";

/** The "dot" items carry a radius and whether they are filled; their colour is a deme hue. */
interface DotItem {
  x: number;
  y: number;
  r: number;
  c: string;
  fill?: boolean;
}

/**
 * The culture disk as an SVG string, `S` px across. With `tmax`, only programs from attempts
 * up to `tmax` are drawn (the replay).
 */
export function diskSvg(r: Run, S: number, tmax: number | null = null): string {
  const m = diskModel(r);
  const by = programsById(r);
  const pad = 44;
  const X = (x: number) => ((x + 1) / 2) * S;
  const Y = (y: number) => (1 - (y + 1) / 2) * S;
  const path = (pts: Pt[]) => pts.map((q, k) => `${k ? "L" : "M"}${X(q[0]).toFixed(1)} ${Y(q[1]).toFixed(1)}`).join("");
  const shown = (id: string) => {
    const p = by.get(id);
    return !!p && (tmax == null || (p[6] || 0) <= tmax);
  };

  const s = [
    `<svg viewBox="${-pad} ${-pad} ${S + 2 * pad} ${S + 2 * pad}" role="img" aria-label="Culture disk">`,
    `<circle cx="${S / 2}" cy="${S / 2}" r="${S / 2}" style="fill:${C.panel};stroke:${C.rule}"/>`,
  ];
  for (const g of [1, 3, 6]) {
    const rr = (Math.tanh(0.42 * g + 0.25) * S) / 2;
    s.push(`<circle cx="${S / 2}" cy="${S / 2}" r="${rr.toFixed(1)}" fill="none" style="stroke:${C.rule}" stroke-dasharray="2 5"/>`);
  }
  // Parent → child edges.
  for (const id of Object.keys(m.pos)) {
    if (!shown(id)) continue;
    const p = by.get(id)!;
    const src: Pt = p[1] && m.pos[p[1]] ? m.pos[p[1]] : [0, 0];
    s.push(
      `<path data-l="${esc(id)}" data-d="${p[2]}" d="${path(geodesic(src, m.pos[id]))}" fill="none" stroke="${demeColor(p[2])}" stroke-width="1" opacity=".55"/>`,
    );
  }
  // Chords: findings passed between demes. The first that raised its child gets the label.
  let labelled = false;
  for (const c of m.chords) {
    if (!shown(c.to)) continue;
    const mark = c.rose && !labelled;
    const cf = by.get(c.from)?.[2] ?? -1;
    const ct = by.get(c.to)?.[2] ?? -1;
    s.push(
      `<path${mark ? ' data-chord="1"' : ""} data-cf="${cf}" data-ct="${ct}" d="${path(geodesic(m.pos[c.from], m.pos[c.to], 40))}" fill="none" style="stroke:${C.chord}" stroke-width="1.5"${c.rose ? "" : ' stroke-dasharray="5 5"'}/>`,
    );
    if (mark) labelled = true;
  }
  // Programs. Stroke stays a presentation attribute so the brushing CSS can override it.
  for (const id of Object.keys(m.dots)) {
    if (!shown(id)) continue;
    const i = m.dots[id] as unknown as DotItem;
    const rr = Math.max(1.6, i.r * S);
    const fill = i.fill ? `fill="${i.c}"` : `style="fill:${C.panel}"`;
    s.push(
      `<circle cx="${(i.x * S).toFixed(1)}" cy="${((1 - i.y) * S).toFixed(1)}" r="${rr.toFixed(1)}" ${fill} stroke="${i.c}" stroke-width="1.2" data-id="${esc(id)}" data-d="${by.get(id)?.[2] ?? -1}"/>`,
    );
  }
  // Ring and label the best program shown.
  let bi: string | null = null;
  let bs = -Infinity;
  for (const id of Object.keys(m.dots)) {
    const sc = by.get(id)?.[4];
    if (shown(id) && sc != null && (bi == null || sc > bs)) {
      bi = id;
      bs = sc;
    }
  }
  if (bi != null) {
    const bd = m.dots[bi] as unknown as DotItem;
    const bx = bd.x * S;
    const byy = (1 - bd.y) * S;
    const rr = Math.max(1.6, bd.r * S) + 6;
    const lft = bx < S / 2;
    s.push(
      `<circle cx="${bx.toFixed(1)}" cy="${byy.toFixed(1)}" r="${rr.toFixed(1)}" fill="none" style="stroke:${C.ink}" stroke-width="1.2"/>` +
        `<text x="${(bx + (lft ? rr + 6 : -rr - 6)).toFixed(1)}" y="${(byy + 4).toFixed(1)}" style="fill:${C.ink}" font-size="${(S / 48).toFixed(1)}" font-weight="600" text-anchor="${lft ? "start" : "end"}">best ${f4(bs)}</text>`,
    );
  }
  s.push(
    `<circle cx="${S / 2}" cy="${S / 2}" r="2.5" style="fill:${C.ink}"/>` +
      `<text x="${S / 2 + 6}" y="${S / 2 + 14}" style="fill:${C.faint}" font-size="${(S / 60).toFixed(1)}">seed</text>`,
  );
  // Sector labels last, with a halo in the panel colour, so programs on the rim don't cover them.
  for (const i of m.texts) {
    const d = demeIndexOfLabel(i.s);
    const text = d == null ? String(i.s ?? "") : demeName(d);
    s.push(
      `<text x="${(i.x as number) * S}" y="${(1 - (i.y as number)) * S}" style="fill:${C.muted};stroke:${C.panel};stroke-width:3px;paint-order:stroke;pointer-events:none" font-size="${(S / 52).toFixed(1)}" text-anchor="middle" dominant-baseline="middle">${esc(text)}</text>`,
    );
  }
  return s.join("") + "</svg>";
}

/** Hovering a program highlights its line of descent. */
function brushLineage(hero: HTMLElement, r: Run): void {
  const by = programsById(r);
  let last: string | null = null;
  const lineage = (start: string) => {
    const set = new Set<string>();
    let id: string | null = start;
    for (let k = 0; id && by.has(id) && !set.has(id) && k < 400; k++) {
      set.add(id);
      id = by.get(id)![1];
    }
    return set;
  };
  const clear = () => hero.querySelectorAll(".hl").forEach((n) => n.classList.remove("hl"));
  hero.addEventListener("mousemove", (e) => {
    const t = e.target as Element | null;
    const id = t?.getAttribute?.("data-id") ?? null;
    if (id === last) return;
    last = id;
    clear();
    if (!id) {
      hero.classList.remove("brush");
      return;
    }
    const set = lineage(id);
    hero.classList.add("brush");
    hero.querySelectorAll("[data-id],[data-l]").forEach((n) => {
      const k = n.getAttribute("data-id") || n.getAttribute("data-l");
      if (k && set.has(k)) n.classList.add("hl");
    });
  });
  hero.addEventListener("mouseleave", () => {
    last = null;
    hero.classList.remove("brush");
    clear();
  });
}

/**
 * Focus one deme: its programs and lines keep their colour, everything else fades, and the findings
 * it sent or received stay red. `null` shows the whole run.
 */
function focusDeme(svg: Element, d: number | null): void {
  svg.querySelectorAll<SVGElement>("[data-d]").forEach((n) => n.classList.toggle("dim", d != null && +n.dataset.d! !== d));
  svg.querySelectorAll<SVGElement>("[data-cf]").forEach((n) => {
    const on = d != null && (+n.dataset.cf! === d || +n.dataset.ct! === d);
    n.classList.toggle("dim", d != null && !on);
    n.classList.toggle("on", on);
  });
}

export async function mount(): Promise<void> {
  // The hero always shows the first run, whichever run the figures below are set to.
  const o = await loadOverview();
  const r = await loadRun(o.order[0]);
  const disk = el("heroDisk");
  hover(disk, r);
  brushLineage(el("hero"), r);
  let svg: SVGSVGElement;
  const by = programsById(r);
  const m = diskModel(r);

  // Numbers in the "how to read it" key.
  const demes = [...new Set(r.programs.map((p) => p[2]))].sort((a, b) => a - b);
  const best = Math.max(...r.programs.map((p) => p[4] ?? -Infinity));
  el("hero-demes").textContent = String(demes.length);
  el("hero-best").textContent = f4(best);

  // One line per deme: size, best score, findings sent and received.
  const info = (d: number | null): string => {
    if (d == null) {
      return `All ${demes.length} demes: ${r.programs.length} programs, ${m.chords.length} findings passed between demes.`;
    }
    const ps = r.programs.filter((p) => p[2] === d);
    const b = Math.max(...ps.map((p) => p[4] ?? -Infinity));
    const sent = m.chords.filter((c) => by.get(c.from)?.[2] === d).length;
    const got = m.chords.filter((c) => by.get(c.to)?.[2] === d);
    const helped = got.filter((c) => c.rose).length;
    return (
      `<b style="color:${demeColor(d)}">${esc(demeName(d))}</b>: ${ps.length} programs, best ${f4(b)}. ` +
      `Sent ${sent} finding${sent === 1 ? "" : "s"}; received ${got.length}` +
      (got.length ? `, ${helped} of which helped.` : ".")
    );
  };
  const chips = el("hero-chips");
  chips.innerHTML =
    `<button type="button" data-k="all" class="on">All</button>` +
    demes.map((d) => `<button type="button" data-k="${d}"><i style="background:${demeColor(d)}"></i>${esc(demeName(d))}</button>`).join("");
  const line = el("hero-info");
  let cur: number | null = null;

  // Replay: the disk grows attempt by attempt, once on arrival, then on request.
  const T = Math.max(...r.programs.map((p) => p[6] || 0));
  const range = el<HTMLInputElement>("heroT");
  const label = el("heroTv");
  const btn = el<HTMLButtonElement>("heroPlay");
  range.max = String(T);
  let shownT = -1;
  const render = (t: number) => {
    t = Math.round(t);
    if (t === shownT) return;
    shownT = t;
    disk.innerHTML = diskSvg(r, 640, t >= T ? null : t);
    svg = disk.querySelector("svg")!;
    focusDeme(svg, cur);
    range.value = String(t);
    label.textContent = `attempt ${t} of ${T}`;
  };
  let playing = !prefersReducedMotion();
  let t = playing ? 0 : T;
  let last = 0;
  const setBtn = () => (btn.textContent = playing ? "Pause" : t >= T ? "Replay" : "Play");
  btn.addEventListener("click", () => {
    playing = !playing;
    if (playing && t >= T) t = 0;
    setBtn();
  });
  range.addEventListener("input", () => {
    playing = false;
    t = +range.value;
    render(t);
    setBtn();
  });
  const frame = (now: number) => {
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (playing && isVisible(disk)) {
      t = Math.min(T, t + (dt * T) / 9); // the whole run in about nine seconds
      render(t);
      if (t >= T) {
        playing = false;
        setBtn();
      }
    }
    requestAnimationFrame(frame);
  };
  render(t);
  setBtn();
  requestAnimationFrame(frame);

  const show = (d: number | null) => {
    cur = d;
    focusDeme(svg, d);
    line.innerHTML = info(d);
    chips.querySelectorAll<HTMLButtonElement>("button").forEach((b) => b.classList.toggle("on", b.dataset.k === (d == null ? "all" : String(d))));
  };
  // A slow tour of the demes until the reader picks one.
  let touring = !prefersReducedMotion();
  const stop = () => (touring = false);
  chips.addEventListener("click", (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>("button");
    if (!b) return;
    stop();
    show(b.dataset.k === "all" ? null : +b.dataset.k!);
  });
  chips.addEventListener("mouseover", stop);
  disk.addEventListener("mouseover", stop);
  const order: (number | null)[] = [null, ...demes];
  let k = 0;
  setInterval(() => {
    if (!touring || playing || t < T || !isVisible(disk)) return;
    k = (k + 1) % order.length;
    show(order[k]);
  }, 2600);
  show(cur);
}
