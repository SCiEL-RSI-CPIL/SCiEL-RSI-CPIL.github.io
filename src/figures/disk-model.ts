// Geometry of the "culture disk" (ported from the top of legacy/assets/disk.js).
// Pure functions shared by the disk, replay and relief figures.

import { programsById, type DiskItem, type Run } from "../lib/data";

export type Pt = [number, number];

/** Points along the Poincaré-disk geodesic from p to q (both inside the unit disk). */
export function geodesic(p: Pt, q: Pt, steps = 18): Pt[] {
  const [x1, y1] = p;
  const [x2, y2] = q;
  const det = x1 * y2 - x2 * y1;
  const out: Pt[] = [];
  if (Math.abs(det) < 1e-9) {
    for (let t = 0; t <= steps; t++) out.push([x1 + ((x2 - x1) * t) / steps, y1 + ((y2 - y1) * t) / steps]);
    return out;
  }
  const k1 = (x1 * x1 + y1 * y1 + 1) / 2;
  const k2 = (x2 * x2 + y2 * y2 + 1) / 2;
  const cx = (k1 * y2 - k2 * y1) / det;
  const cy = (x1 * k2 - x2 * k1) / det;
  const rad = Math.hypot(x1 - cx, y1 - cy);
  const a1 = Math.atan2(y1 - cy, x1 - cx);
  const a2 = Math.atan2(y2 - cy, x2 - cx);
  const d = ((((a2 - a1 + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
  for (let t = 0; t <= steps; t++) out.push([cx + rad * Math.cos(a1 + (d * t) / steps), cy + rad * Math.sin(a1 + (d * t) / steps)]);
  return out;
}

export interface Chord {
  /** Internal program ids (never shown). */
  from: string;
  to: string;
  rose: boolean;
}

export interface DiskModel {
  /** Program id → position in [-1, 1]². */
  pos: Record<string, Pt>;
  /** Program id → its "dot" item from run.disk (x, y in [0, 1]). */
  dots: Record<string, DiskItem>;
  /** The "text" items from run.disk (sector labels; their `s` is an internal "I<n>" deme label). */
  texts: DiskItem[];
  chords: Chord[];
}

const cache = new WeakMap<Run, DiskModel>();

export function diskModel(r: Run): DiskModel {
  const hit = cache.get(r);
  if (hit) return hit;
  const pos: Record<string, Pt> = {};
  const dots: Record<string, DiskItem> = {};
  const texts: DiskItem[] = [];
  for (const i of r.disk) {
    if (i.t === "dot" && typeof i.id === "string") {
      pos[i.id] = [2 * (i.x as number) - 1, 2 * (i.y as number) - 1];
      dots[i.id] = i;
    } else if (i.t === "text") texts.push(i);
  }
  const by = programsById(r);
  const best: Record<number, string> = {};
  for (const p of r.programs) {
    const cur = best[p[2]];
    if (p[4] != null && (cur == null || p[4] > (by.get(cur)?.[4] ?? -Infinity))) best[p[2]] = p[0];
  }
  const cellProg: Record<string, string> = {};
  for (const c of r.cells) cellProg[c.cell] = c.program;
  const chords = r.transfers
    .map((t) => {
      const cell = r.fcell[t.finding];
      return { from: (cell && cellProg[cell]) || best[t.from_island], to: t.child, rose: t.rose };
    })
    .filter((c) => pos[c.from] && pos[c.to]);
  const m = { pos, dots, texts, chords };
  cache.set(r, m);
  return m;
}

/** Sector label items carry "I0", "I1", … (internal island ids). Return the 0-based deme index. */
export function demeIndexOfLabel(s: unknown): number | null {
  const m = /^I(\d+)$/.exec(String(s ?? ""));
  return m ? +m[1] : null;
}
