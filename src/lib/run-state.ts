
import { loadOverview, loadRun, type Run } from "./data";

let current: string | null = null;
const listeners = new Set<(id: string) => void>();

export async function currentRunId(): Promise<string> {
  if (current == null) current = (await loadOverview()).order[0];
  return current;
}

export async function currentRun(): Promise<Run> {
  return loadRun(await currentRunId());
}

export function setCurrentRun(id: string): void {
  if (id === current) return;
  current = id;
  listeners.forEach((f) => f(id));
}

export function onRunChange(f: (id: string) => void): () => void {
  listeners.add(f);
  return () => listeners.delete(f);
}
