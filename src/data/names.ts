
export const ARENA_URL = "https://research-arena.small-pine-3af7.workers.dev/experiments";

export type TaskKey = "autocorrelation" | "circles";

export const TASK_NAMES: Record<TaskKey, string> = {
  autocorrelation: "Autocorrelation",
  circles: "Circle packing",
};

export interface RunMeta {
  id: string;
  task: TaskKey;
  letter: "A" | "B" | "C";
  color: string;
}

export const RUNS: RunMeta[] = [
  { id: "4188325b", task: "autocorrelation", letter: "A", color: "#3A6EA5" },
  { id: "8e06385e", task: "autocorrelation", letter: "B", color: "#6E5BB5" },
  { id: "bfd1c068", task: "autocorrelation", letter: "C", color: "#1A9BB5" },
  { id: "aa8fed08", task: "circles", letter: "A", color: "#D0702F" },
  { id: "dc9726aa", task: "circles", letter: "B", color: "#B08A20" },
  { id: "560bd98d", task: "circles", letter: "C", color: "#A63D3D" },
];

const byId = new Map(RUNS.map((r) => [r.id, r]));

export function runMeta(id: string): RunMeta {
  const r = byId.get(id);
  if (!r) throw new Error(`Unknown run ${id}: add it to src/data/names.ts`);
  return r;
}

export function runName(id: string): string {
  const r = runMeta(id);
  return `${TASK_NAMES[r.task]} ${r.letter}`;
}

export function demeName(index: number): string {
  return `Deme ${index + 1}`;
}

export function sortRuns(ids: readonly string[]): string[] {
  const rank = new Map(RUNS.map((r, i) => [r.id, i]));
  return [...ids].sort((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99));
}
