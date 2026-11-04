// Every name a reader sees for a run, a task or a deme comes from here.
// Internal IDs (run hashes, program IDs, research-cell hashes) are never shown in the page text;
// the run hash survives only as the target of the Arena link, for people who want the raw record.

export const ARENA_URL = "https://research-arena.small-pine-3af7.workers.dev/experiments";

export type TaskKey = "autocorrelation" | "circles";

export const TASK_NAMES: Record<TaskKey, string> = {
  autocorrelation: "Autocorrelation",
  circles: "Circle packing",
};

export interface RunMeta {
  /** Hash used by the run viewer and the Arena; never rendered as text. */
  id: string;
  task: TaskKey;
  /** Letter within its task, ranked by final score (A = best). */
  letter: "A" | "B" | "C";
  color: string;
}

// Ranked within each task by final score:
// autocorrelation 0.99945 > 0.99823 > 0.99766; circle packing 1.00012 > 0.99973 > 0.99852.
export const RUNS: RunMeta[] = [
  { id: "4188325b", task: "autocorrelation", letter: "A", color: "#0A84FF" },
  { id: "8e06385e", task: "autocorrelation", letter: "B", color: "#4F7BE8" },
  { id: "bfd1c068", task: "autocorrelation", letter: "C", color: "#64D2FF" },
  { id: "aa8fed08", task: "circles", letter: "A", color: "#E8A33D" },
  { id: "dc9726aa", task: "circles", letter: "B", color: "#D1B23F" },
  { id: "560bd98d", task: "circles", letter: "C", color: "#E0637F" },
];

const byId = new Map(RUNS.map((r) => [r.id, r]));

export function runMeta(id: string): RunMeta {
  const r = byId.get(id);
  if (!r) throw new Error(`Unknown run ${id}: add it to src/data/names.ts`);
  return r;
}

/** "Autocorrelation A" */
export function runName(id: string): string {
  const r = runMeta(id);
  return `${TASK_NAMES[r.task]} ${r.letter}`;
}

/** Data uses 0-based deme indices; readers always see 1-based "Deme 3". */
export function demeName(index: number): string {
  return `Deme ${index + 1}`;
}

/** Run ids in reader order: by task, then letter (Autocorrelation A, B, C, Circle packing A, …). */
export function sortRuns(ids: readonly string[]): string[] {
  const rank = new Map(RUNS.map((r, i) => [r.id, i]));
  return [...ids].sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
}
