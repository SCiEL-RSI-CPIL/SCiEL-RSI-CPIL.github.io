// Hero: the culture disk of the first run beside its code map, with lineage brushing.
// Ported from legacy/assets/disk.js (the geometry lives in disk-model.ts).

import { C, demeColor, el, esc, f4 } from "../lib/core";
import { loadOverview, loadRun, programsById, type Run } from "../lib/data";
import { chordLabel, hover } from "../lib/tooltip";
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
  const pad = 16;
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
      `<path data-l="${esc(id)}" d="${path(geodesic(src, m.pos[id]))}" fill="none" stroke="${demeColor(p[2])}" stroke-width="1" opacity=".55"/>`,
    );
  }
  // Chords: findings passed between demes. The first that raised its child gets the label.
  let labelled = false;
  for (const c of m.chords) {
    if (!shown(c.to)) continue;
    const mark = c.rose && !labelled;
    s.push(
      `<path${mark ? ' data-chord="1"' : ""} d="${path(geodesic(m.pos[c.from], m.pos[c.to], 40))}" fill="none" style="stroke:${C.chord}" stroke-width="2"${c.rose ? "" : ' stroke-dasharray="5 5"'}/>`,
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
      `<circle cx="${(i.x * S).toFixed(1)}" cy="${((1 - i.y) * S).toFixed(1)}" r="${rr.toFixed(1)}" ${fill} stroke="${i.c}" stroke-width="1.2" data-id="${esc(id)}"/>`,
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

/** The code map (programs placed by a 2-D projection of their code) as an SVG string. */
export function codeSvg(r: Run, W: number, H: number): string {
  const c = r.coords.code;
  const by = programsById(r);
  const L = 48;
  const B = 40;
  const T = 8;
  const Rr = 8;
  const X = (x: number) => L + x * (W - L - Rr);
  const Y = (y: number) => T + (1 - y) * (H - T - B);
  const ids = Object.keys(c);
  const sc = r.programs.filter((p) => c[p[0]] && p[4] != null).map((p) => p[4] as number);
  const lo = Math.min(...sc);
  const hi = Math.max(...sc);

  let s =
    `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Code map">` +
    `<defs><radialGradient id="bl"><stop offset="0" style="stop-color:${C.accent}" stop-opacity="1"/><stop offset="1" style="stop-color:${C.accent}" stop-opacity="0"/></radialGradient></defs>` +
    `<rect x="${L}" y="${T}" width="${W - L - Rr}" height="${H - T - B}" style="fill:${C.panel};stroke:${C.rule}"/>`;
  // A soft glow under each scored program, brighter for better scores.
  for (const id of ids) {
    const p = by.get(id);
    if (!p || p[4] == null) continue;
    const op = 0.05 + 0.3 * Math.pow((p[4] - lo) / (hi - lo || 1), 3);
    s += `<circle cx="${X(c[id][0]).toFixed(1)}" cy="${Y(c[id][1]).toFixed(1)}" r="${W * 0.045}" fill="url(#bl)" opacity="${op.toFixed(3)}"/>`;
  }
  for (const id of ids) {
    const p = by.get(id);
    const q = p && p[1] ? c[p[1]] : undefined;
    if (q) {
      s += `<line data-l="${esc(id)}" x1="${X(q[0]).toFixed(1)}" y1="${Y(q[1]).toFixed(1)}" x2="${X(c[id][0]).toFixed(1)}" y2="${Y(c[id][1]).toFixed(1)}" style="stroke:${C.muted}" stroke-width=".7" opacity=".45"/>`;
    }
  }
  // The outline colour is inherited from the group so the brushing CSS can still override it.
  s += `<g style="stroke:${C.bg}" stroke-width=".8">`;
  for (const id of ids) {
    const p = by.get(id);
    if (!p) continue;
    s += `<circle cx="${X(c[id][0]).toFixed(1)}" cy="${Y(c[id][1]).toFixed(1)}" r="3.6" fill="${demeColor(p[2])}" data-id="${esc(id)}"/>`;
  }
  s += "</g>";
  let bi: string | null = null;
  let bs = -Infinity;
  for (const id of ids) {
    const sc = by.get(id)?.[4];
    if (sc != null && (bi == null || sc > bs)) {
      bi = id;
      bs = sc;
    }
  }
  if (bi != null) {
    const bx = X(c[bi][0]);
    const byy = Y(c[bi][1]);
    const lft = bx < L + (W - L) / 2;
    s +=
      `<circle cx="${bx.toFixed(1)}" cy="${byy.toFixed(1)}" r="9" fill="none" style="stroke:${C.ink}" stroke-width="1.2"/>` +
      `<text x="${(bx + (lft ? 15 : -15)).toFixed(1)}" y="${(byy + 4).toFixed(1)}" style="fill:${C.ink}" font-size="13" font-weight="600" text-anchor="${lft ? "start" : "end"}">best ${f4(bs)}</text>`;
  }
  const my = T + (H - T - B) / 2;
  s +=
    `<text x="${L + (W - L) / 2}" y="${H - 10}" style="fill:${C.muted}" font-size="12" text-anchor="middle">code, component 1</text>` +
    `<text x="16" y="${my}" style="fill:${C.muted}" font-size="12" text-anchor="middle" transform="rotate(-90 16 ${my})">code, component 2</text>`;
  return s + "</svg>";
}

/** Hovering a program highlights its line of descent in both panels. */
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

export async function mount(): Promise<void> {
  // The hero always shows the first run, whichever run the figures below are set to.
  const o = await loadOverview();
  const r = await loadRun(o.order[0]);
  const disk = el("heroDisk");
  disk.innerHTML = diskSvg(r, 640);
  chordLabel(disk);
  hover(disk, r);
  const code = el("heroCode");
  code.innerHTML = codeSvg(r, 800, 560);
  hover(code, r);
  brushLineage(el("hero"), r);
}
