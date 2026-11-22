
import type { TaskKey } from "../data/names";
import { legacyColor } from "./core";

export type Program = [
  id: string,
  parent: string | null,
  deme: number,
  generation: number,
  score: number | null,
  valid: boolean,
  attempt: number | null,
  op: string,
  idea: string,
];

export type Edit = [before: number, after: number, deme: number];

export type CostStep = [step: number, dollars: number, calls: number, best: number];

export type EngineStep = [number, number, number, number, number, Record<string, [string, Record<string, number>]>];

export interface RunSummary {
  task: TaskKey;
  best: number;
  hours: number;
  nfind: number;
  delivered: number;
  programs: Program[];
  edits: Edit[];
  steps: CostStep[];
}

export interface DiskItem {
  t: string;
  x?: number;
  y?: number;
  r?: number;
  c?: string;
  s?: string;
  [k: string]: unknown;
}

export interface ChainStep {
  it: number;
  island: number;
  parent: string;
  child: string;
  score: number;
  before: number;
  op: string;
  mode: string;
}

export interface Transfer {
  finding: string;
  from_island: number;
  child: string;
  island: number;
  rose: boolean;
}

export interface Cell {
  id: string;
  cell: string;
  island: number;
  program: string;
  state: string;
}

export interface Finding {
  id: string;
  text: string;
  island: number;
  status: string;
  kind: string;
  cell: string | null;
  delivered: number;
}

export interface RunDetail {
  disk: DiskItem[];
  coords: Record<"landscape" | "code", Record<string, [number, number]>>;
  axes: Record<"landscape" | "code", [string, string]>;
  codecap: string;
  chain: ChainStep[];
  transfers: Transfer[];
  cells: Cell[];
  findings: Finding[];
  fcell: Record<string, string | null>;
  engine: {
    steps: EngineStep[];
    forecasts: unknown[][];
    swm: unknown[][];
    policy: unknown[][];
    research: { cells: number; decisions: number; phases: Record<string, number> } & Record<string, unknown>;
  };
}

export type Run = RunSummary & RunDetail & { id: string };

export interface Overview {
  order: string[];
  tasks: Record<string, any>[];
  oppi: Record<string, [number, number]>;
  field: { fams: string[]; cells: Record<string, [number, number]> } & Record<string, any>;
  culture: Record<string, any>;
  vq: { xy: [number, number][]; dim: number } & Record<string, any>;
  niches: { final: any[]; snaps: any[]; reached: any; counts: any };
  runs: Record<string, RunSummary>;
}

export interface DemoStep {
  it: number;
  before: number;
  score: number;
  op: string;
  idea: string;
  diff: [kind: string, line: string][];
}

export interface Demo {
  task: string;
  best: number;
  steps: DemoStep[];
}

const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");

const cache = new Map<string, Promise<unknown>>();
function getJSON<T>(path: string): Promise<T> {
  let p = cache.get(path);
  if (!p) {
    p = fetch(base + path).then((r) => {
      if (!r.ok) throw new Error(`${path}: ${r.status}`);
      return r.json();
    });
    cache.set(path, p);
  }
  return p as Promise<T>;
}

export const loadOverview = () => getJSON<Overview>("data/overview.json");
export const loadDemo = () => getJSON<Demo>("data/demo.json");

const runCache = new Map<string, Promise<Run>>();
export function loadRun(id: string): Promise<Run> {
  let p = runCache.get(id);
  if (!p) {
    p = Promise.all([loadOverview(), getJSON<RunDetail>(`data/runs/${id}.json`)]).then(([o, d]) => {
      const s = o.runs[id];
      if (!s) throw new Error(`run ${id} missing from overview.json`);
      for (const i of d.disk) if (typeof i.c === "string") i.c = legacyColor(i.c);
      return { id, ...s, ...d };
    });
    runCache.set(id, p);
  }
  return p;
}

const byIdCache = new WeakMap<Run | RunSummary, Map<string, Program>>();
export function programsById(r: Run | RunSummary): Map<string, Program> {
  let m = byIdCache.get(r);
  if (!m) {
    m = new Map(r.programs.map((p) => [p[0], p]));
    byIdCache.set(r, m);
  }
  return m;
}
